import * as THREE from 'three';

// Pre-allocated scratch vectors for zero-GC per-frame ribbon evaluation
const _p = new THREE.Vector3();
const _pNext = new THREE.Vector3();
const _pPrev = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _binormal = new THREE.Vector3();
const _vBottom = new THREE.Vector3();
const _vTop = new THREE.Vector3();

// High-density arc-length integration table for exact, kink-free uniform frame spacing
const ARC_TABLE_SAMPLES = 2048;

export class DynamicFilmRibbon {
  public readonly segments: number;
  public readonly ribbonHeight: number;
  public readonly framePitch: number;
  public readonly geometry: THREE.BufferGeometry;
  public totalArcLength = 34;

  // Live lowest-fold contact anchor (world-space) for tightening/loosening the contact shadow
  public readonly foldContactAnchor = new THREE.Vector3(-0.58, -2.55, 1.45);
  public foldElevationFactor = 0.5;

  private readonly arcTable = new Float32Array(ARC_TABLE_SAMPLES + 1);
  private readonly tSamples: Float32Array;
  private readonly arcDistances: Float32Array;

  constructor(segments = 600, ribbonHeight = 2.68, framePitch = 2.98) {
    this.segments = segments;
    this.ribbonHeight = ribbonHeight;
    this.framePitch = framePitch;

    this.tSamples = new Float32Array(segments + 1);
    this.arcDistances = new Float32Array(segments + 1);

    const vertexCount = (segments + 1) * 2;
    const positions = new Float32Array(vertexCount * 3);
    const normals = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    // x = arc length in frame units, y = normalized curve parameter (0..1)
    const ribbonMeta = new Float32Array(vertexCount * 2);

    const indexCount = segments * 6;
    const indices = new Uint16Array(indexCount);
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      const idx = i * 6;
      indices[idx] = a;
      indices[idx + 1] = c;
      indices[idx + 2] = b;
      indices[idx + 3] = b;
      indices[idx + 4] = c;
      indices[idx + 5] = d;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setAttribute('aRibbonMeta', new THREE.BufferAttribute(ribbonMeta, 2));
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    this.updateGeometry(0, 0, 0, 1);
  }

  /**
   * Pure C-infinity analytic 3D S-fold centerline with generous cylindrical turn radii.
   * Parameter t runs smoothly from -1 (far left) to +1 (far right), with a strictly monotonic +Z
   * cylindrical S-bend centered around t = 0.
   */
  public evalPoint(
    t: number,
    elapsedTime: number,
    clampedVel: number,
    speedMag: number,
    scrollPos: number,
    waveStrength: number,
    out: THREE.Vector3
  ): void {
    // 1. Base X: smooth wide Gaussian S-reversal around t = 0
    const sigmaX = 0.168;
    const uX = t / sigmaX;
    const xBase = -0.74 + 12.4 * t - 22.0 * t * Math.exp(-uX * uX);

    // 2. Base Y: smooth gentle diagonal sweep with refined vertical step across the S-fold
    const sigmaY = 0.168;
    const yBase = -0.46 + 4.85 * t - 1.66 * Math.tanh(t / sigmaY);

    // 3. Base Z: wide, round, strictly monotonic back-to-front transition across the S-fold
    const sigmaZ = 0.138;
    const zBase = 1.98 * Math.tanh(t / sigmaZ) - 1.55 * t * t;

    // Smooth Gaussian core-protection envelopes so the central cylindrical bend stays taut
    const uFoldY = t / 0.28;
    const uFoldZ = t / 0.32;
    const yWaveEnv = 1.0 - 0.85 * Math.exp(-uFoldY * uFoldY);
    const zWaveEnv = 1.0 - Math.exp(-uFoldZ * uFoldZ);
    const xWaveEnv = 1.0 - 0.92 * Math.exp(-uFoldZ * uFoldZ);

    // Slow, calm ease-in-out organic floating motion
    const ambientY =
      Math.sin(elapsedTime * 0.65 + t * Math.PI * 2.0) * 0.048 * waveStrength * yWaveEnv;
    const ambientZ =
      Math.cos(elapsedTime * 0.52 + t * Math.PI * 1.8) * 0.04 * waveStrength * zWaveEnv;

    // Smooth wave undulation driven by scroll motion
    const wavePhase = t * Math.PI * 3.4 - scrollPos * 1.35;
    const dynamicY = Math.sin(wavePhase) * speedMag * 0.22 * waveStrength * yWaveEnv;
    const dynamicZ = Math.cos(wavePhase * 0.85) * speedMag * 0.20 * waveStrength * zWaveEnv;
    const dynamicX = Math.sin(wavePhase * 0.65) * clampedVel * 0.055 * waveStrength * xWaveEnv;

    out.set(xBase + dynamicX, yBase + ambientY + dynamicY, zBase + ambientZ + dynamicZ);
  }

  /**
   * Re-computes all 600 ribbon columns with true cylindrical vertical rulings through the S-fold
   * and exact differential-geometry normals N = normalize(T x B).
   */
  public updateGeometry(
    elapsedTime: number,
    scrollVelocity: number,
    scrollPos: number,
    waveStrength: number
  ): void {
    const clampedVel = THREE.MathUtils.clamp(scrollVelocity, -2.4, 2.4);
    const speedMag = Math.abs(clampedVel);

    // Step 1: Integrate exact arc length across 2048 dense analytic samples on t in [-1, +1]
    this.arcTable[0] = 0;
    this.evalPoint(-1, elapsedTime, clampedVel, speedMag, scrollPos, waveStrength, _pPrev);
    let accum = 0;
    const invTable = 2 / ARC_TABLE_SAMPLES;

    for (let i = 1; i <= ARC_TABLE_SAMPLES; i++) {
      const t = -1 + i * invTable;
      this.evalPoint(t, elapsedTime, clampedVel, speedMag, scrollPos, waveStrength, _p);
      accum += _p.distanceTo(_pPrev);
      this.arcTable[i] = accum;
      _pPrev.copy(_p);
    }
    this.totalArcLength = accum;

    // Step 2: Invert arc-length table via binary search for uniform arc-length parameterization
    const segs = this.segments;
    const invSegs = 1 / segs;

    for (let i = 0; i <= segs; i++) {
      const s = i * invSegs;
      const targetLen = s * this.totalArcLength;
      this.arcDistances[i] = targetLen;

      if (i === 0) {
        this.tSamples[i] = -1;
        continue;
      }
      if (i === segs) {
        this.tSamples[i] = 1;
        continue;
      }

      let lo = 0;
      let hi = ARC_TABLE_SAMPLES;
      while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (this.arcTable[mid] < targetLen) {
          lo = mid;
        } else {
          hi = mid;
        }
      }

      const lenLo = this.arcTable[lo];
      const lenHi = this.arcTable[hi];
      const frac = lenHi > lenLo ? (targetLen - lenLo) / (lenHi - lenLo) : 0;
      this.tSamples[i] = -1 + (lo + frac) * invTable;
    }

    // Step 3: Populate ribbon vertices with true cylindrical rulings
    const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
    const normAttr = this.geometry.attributes.normal as THREE.BufferAttribute;
    const uvAttr = this.geometry.attributes.uv as THREE.BufferAttribute;
    const metaAttr = this.geometry.attributes.aRibbonMeta as THREE.BufferAttribute;

    const halfH = this.ribbonHeight * 0.5;
    const dtEps = 0.00025;
    let lowestY = Infinity;
    let lowestX = -0.58;
    let lowestZ = 1.45;

    for (let i = 0; i <= segs; i++) {
      const s = i * invSegs;
      const t = this.tSamples[i];
      this.evalPoint(t, elapsedTime, clampedVel, speedMag, scrollPos, waveStrength, _p);

      const tPrev = Math.max(-1, t - dtEps);
      const tNext = Math.min(1, t + dtEps);
      this.evalPoint(tPrev, elapsedTime, clampedVel, speedMag, scrollPos, waveStrength, _pPrev);
      this.evalPoint(tNext, elapsedTime, clampedVel, speedMag, scrollPos, waveStrength, _pNext);
      _tangent.subVectors(_pNext, _pPrev).normalize();

      const uWing = t / 0.27;
      const wingMask = 1.0 - Math.exp(-uWing * uWing);
      const wingSlopeAngle =
        Math.atan2(_tangent.y, Math.max(0.35, Math.abs(_tangent.x))) * wingMask;
      const tiltAngle = THREE.MathUtils.clamp(wingSlopeAngle, -0.42, 0.42);
      const sinT = Math.sin(tiltAngle);
      const cosT = Math.cos(tiltAngle);

      const uBank = t / 0.34;
      const bankMask = 1.0 - Math.exp(-uBank * uBank);
      const waveBank =
        Math.sin(t * Math.PI * 3.0 - scrollPos * 1.2) * clampedVel * 0.04 * waveStrength * bankMask;

      _binormal.set(-sinT, cosT, Math.sin(waveBank)).normalize();

      _normal.crossVectors(_tangent, _binormal);
      if (_normal.lengthSq() < 1e-6) {
        _normal.set(0, 0, 1);
      } else {
        _normal.normalize();
      }

      _vBottom.copy(_p).addScaledVector(_binormal, -halfH);
      _vTop.copy(_p).addScaledVector(_binormal, halfH);

      // Track lowest point of the central foreground bend (t in [0.02, 0.30]) for live contact shadow
      if (t >= 0.02 && t <= 0.30 && _vBottom.y < lowestY) {
        lowestY = _vBottom.y;
        lowestX = _vBottom.x;
        lowestZ = _vBottom.z;
      }

      const vIdx = i * 2;
      posAttr.setXYZ(vIdx, _vBottom.x, _vBottom.y, _vBottom.z);
      posAttr.setXYZ(vIdx + 1, _vTop.x, _vTop.y, _vTop.z);

      normAttr.setXYZ(vIdx, _normal.x, _normal.y, _normal.z);
      normAttr.setXYZ(vIdx + 1, _normal.x, _normal.y, _normal.z);

      uvAttr.setXY(vIdx, s, 0);
      uvAttr.setXY(vIdx + 1, s, 1);

      const frameUnits = this.arcDistances[i] / this.framePitch;
      metaAttr.setXY(vIdx, frameUnits, s);
      metaAttr.setXY(vIdx + 1, frameUnits, s);
    }

    this.foldContactAnchor.set(lowestX, lowestY, lowestZ);
    // Normalized elevation factor (0 = tight/closest to surface, 1 = lifted/looser)
    this.foldElevationFactor = THREE.MathUtils.clamp((lowestY + 2.75) * 3.2, 0, 1);

    posAttr.needsUpdate = true;
    normAttr.needsUpdate = true;
    uvAttr.needsUpdate = true;
    metaAttr.needsUpdate = true;

    this.geometry.computeBoundingSphere();
  }

  public dispose(): void {
    this.geometry.dispose();
  }
}
