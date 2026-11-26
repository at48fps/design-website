import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { FilmFrameItem } from './frames';
import { FilmAtlasBuilder } from './filmAtlas';
import { DynamicFilmRibbon } from './filmCurve';

/**
 * 35mm film strip scene, ported from the "iara.sharma — 35mm interactive film
 * archive" prototype. Site changes: the page scroll (capabilities story `scrub`)
 * drives the strip instead of a hijacked mouse wheel; the camera is fitted to its
 * own box under the copy (so the strip can never reach the text); the loop pauses
 * while the page is hidden or off screen; no tuning controls (wave mode / drift).
 */

/** Strip travel per scrolled pixel (same as the prototype's wheel speed). */
const SCROLL_PER_PX = 0.0021;
/** Strip position on load. */
const START_SCROLL = -2.92;
/** Share of the box height the strip may use (rest is breathing room / waves). */
const FIT_HEIGHT = 0.9;

export interface FilmStripCallbacks {
  onActiveFrameChange?: (frameIndex: number) => void;
  onHoverFrameChange?: (frameIndex: number | null) => void;
  onSelectFrame?: (frameIndex: number) => void;
  onContextLost?: (lost: boolean) => void;
}

// "fluid" wave mode of the prototype.
const WAVE_STRENGTH = 1.0;

// Same as the page background (--color-page), so the canvas box is invisible.
const BG_COLOR = 0xededed;
const SHADOW_SPINE_COUNT = 36;

// Pre-allocated raycasting helpers (zero-GC inside events/loop)
const _ndc = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
const _projVec = new THREE.Vector3();

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class FilmStripScene {
  private readonly container: HTMLElement;
  private readonly callbacks: FilmStripCallbacks;
  private readonly isSoftwareGl: boolean;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly envRenderTarget: THREE.WebGLRenderTarget;
  private readonly ribbon: DynamicFilmRibbon;
  private readonly atlas: FilmAtlasBuilder;
  private readonly bodyMaterial: THREE.MeshPhysicalMaterial;
  private readonly sprocketMaterial: THREE.MeshPhysicalMaterial;
  private readonly ribbonMesh: THREE.Mesh;
  private readonly sprocketMesh: THREE.Mesh;

  // Full-backdrop zero-edge analytic cast + contact shadow layer
  private readonly backdropShadowGeometry: THREE.PlaneGeometry;
  private readonly backdropShadowMaterial: THREE.ShaderMaterial;
  private readonly backdropShadowMesh: THREE.Mesh;

  private readonly uniforms = {
    uFilmAtlas: { value: null as THREE.Texture | null },
    uScroll: { value: START_SCROLL },
    uHoveredFrame: { value: -1.0 },
    uBgColor: { value: new THREE.Color(BG_COLOR) },
    uFrameCount: { value: 8.0 },
    // Drawing-buffer size, for the screen-space side fade.
    uViewport: { value: new THREE.Vector2(1, 1) },
  };

  private readonly shadowUniforms = {
    uShadowSpine: {
      value: Array.from({ length: SHADOW_SPINE_COUNT }, () => new THREE.Vector4(0, -10, 0.5, 0)),
    },
    uFoldAnchor: { value: new THREE.Vector2(-0.48, -3.5) },
    uCastBlur: { value: 1.0 },
    uContactTightness: { value: 0.5 },
    uViewport: this.uniforms.uViewport,
  };

  // Scroll, motion, and async lagged shadow state (light NEVER moves; shadow lags asynchronously behind motion)
  private targetScroll = START_SCROLL;
  private currentScroll = START_SCROLL;
  private scrollVelocity = 0;
  private laggedScroll = START_SCROLL;
  private laggedVelocity = 0;
  private laggedFoldX = -0.48;
  private laggedFoldY = -3.5;
  private shadowSpineInitialized = false;
  private castBlurFactor = 1.0;
  private contactTightness = 0.5;
  private reducedMotion = false;
  /** Last page-scroll position fed in (px), to turn scroll into strip travel. */
  private lastScrollPx: number | null = null;

  // Camera fitted to the box (see fitCamera).
  private camDist = 13.2;
  private camLookY = 0.44;
  private camBaseY = 1.72;
  private inView = true;
  private readonly resizeObserver: ResizeObserver;
  private readonly intersectionObserver: IntersectionObserver;

  // Pointer & drag interaction state
  private pointerTargetX = 0;
  private pointerTargetY = 0;
  private pointerX = 0;
  private pointerY = 0;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragMoved = false;
  private lastDragX = 0;
  private lastDragY = 0;
  private hoveredFrame: number | null = null;
  private activeFrame = 3;
  private lastHoverRaycastTime = 0;

  // Lifecycle state
  private frameId = 0;
  private disposed = false;
  private contextLost = false;
  private lastTime = performance.now();
  private elapsedTime = 0;

  // Bound event listeners
  private readonly handleResizeBound: () => void;
  private readonly handlePointerDownBound: (e: PointerEvent) => void;
  private readonly handlePointerMoveBound: (e: PointerEvent) => void;
  private readonly handlePointerUpBound: (e: PointerEvent) => void;
  private readonly handlePointerLeaveBound: () => void;
  private readonly handleContextLostBound: (e: Event) => void;
  private readonly handleContextRestoredBound: () => void;

  constructor(container: HTMLElement, frames: FilmFrameItem[], callbacks: FilmStripCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.96;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.getDrawingBufferSize(this.uniforms.uViewport.value);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    // Vertical swipes keep scrolling the page; horizontal drags move the strip.
    this.renderer.domElement.style.touchAction = 'pan-y';
    this.renderer.domElement.style.cursor = 'grab';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);
    this.scene.fog = new THREE.Fog(BG_COLOR, 15.5, 27.0);

    this.camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 80);

    // Fixed studio environment reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRenderTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    this.scene.environmentIntensity = 0.48;
    pmrem.dispose();

    // FIXED WORLD-SPACE LIGHTING:
    // Top-left, slightly front. Up-facing surfaces are bright, down-facing surfaces are dark.
    // Light never moves — only the tape slides through it.
    const hemiLight = new THREE.HemisphereLight(0xf8fafe, 0x3f434b, 0.82);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.32);
    keyLight.position.set(-7.5, 9.8, 6.4);
    this.scene.add(keyLight);

    const softFrontFill = new THREE.DirectionalLight(0xeef2f7, 0.34);
    softFrontFill.position.set(2.2, 3.0, 9.0);
    this.scene.add(softFrontFill);

    // Oversized full-backdrop shadow plane (z = -3.8): zero hard borders, zero folding artifacts
    this.backdropShadowGeometry = new THREE.PlaneGeometry(46, 26);
    this.backdropShadowMaterial = this.createBackdropShadowMaterial();
    this.backdropShadowMesh = new THREE.Mesh(
      this.backdropShadowGeometry,
      this.backdropShadowMaterial
    );
    this.backdropShadowMesh.position.set(0, 0, -3.8);
    this.backdropShadowMesh.renderOrder = 0;
    this.scene.add(this.backdropShadowMesh);

    // High-resolution 4x2 frame texture atlas
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.atlas = new FilmAtlasBuilder(maxAniso);
    this.uniforms.uFilmAtlas.value = this.atlas.texture;

    // Monotonic +Z C-infinity cylindrical S-fold 3D filmstrip ribbon geometry
    this.ribbon = new DynamicFilmRibbon(600, 2.68, 2.98);
    this.fitCamera(width / height);

    // Pass 1: Glossy silver-grey plastic acetate filmstrip + fixed top-left light + diagonal shine
    this.bodyMaterial = this.createFilmBodyMaterial();
    this.ribbonMesh = new THREE.Mesh(this.ribbon.geometry, this.bodyMaterial);
    this.ribbonMesh.frustumCulled = false;
    this.ribbonMesh.renderOrder = 1;
    this.scene.add(this.ribbonMesh);

    // Pass 2: Recessed sprocket perforations with top inner shadow + faint bottom highlight
    this.sprocketMaterial = this.createSprocketMembraneMaterial();
    this.sprocketMesh = new THREE.Mesh(this.ribbon.geometry, this.sprocketMaterial);
    this.sprocketMesh.frustumCulled = false;
    this.sprocketMesh.renderOrder = 2;
    this.scene.add(this.sprocketMesh);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind interaction listeners
    this.handleResizeBound = this.handleResize.bind(this);
    this.handlePointerDownBound = this.handlePointerDown.bind(this);
    this.handlePointerMoveBound = this.handlePointerMove.bind(this);
    this.handlePointerUpBound = this.handlePointerUp.bind(this);
    this.handlePointerLeaveBound = this.handlePointerLeave.bind(this);
    this.handleContextLostBound = this.handleContextLost.bind(this);
    this.handleContextRestoredBound = this.handleContextRestored.bind(this);

    window.addEventListener('resize', this.handleResizeBound);
    this.resizeObserver = new ResizeObserver(this.handleResizeBound);
    this.resizeObserver.observe(container);
    this.intersectionObserver = new IntersectionObserver(([entry]) => {
      this.inView = entry.isIntersecting;
    });
    this.intersectionObserver.observe(container);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDownBound);
    window.addEventListener('pointermove', this.handlePointerMoveBound);
    window.addEventListener('pointerup', this.handlePointerUpBound);
    dom.addEventListener('pointerleave', this.handlePointerLeaveBound);
    dom.addEventListener('webglcontextlost', this.handleContextLostBound);
    dom.addEventListener('webglcontextrestored', this.handleContextRestoredBound);

    void this.atlas.renderFrames(frames);
    this.startLoop();
  }

  /**
   * Full-backdrop projected bottom-edge shadow shader (zero edges, zero quad boundaries):
   * - Traces all 36 asynchronously lagged projected points along the ENTIRE bottom edge of the tape
   *   (left arm, central fold curve, and full right sweeping arm).
   * - Broad soft cast shadow (~14-18% black) offset down-right from fixed top-left light,
   *   trails asynchronously behind scroll/wave motion and softens gently with speed.
   * - Tighter bottom-edge contact shadow hugging everywhere along the bottom of the tape,
   *   deepening softly under the central fold bend.
   */
  private createBackdropShadowMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: this.shadowUniforms,
      vertexShader: `
        varying vec2 vWorldXY;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldXY = wp.xy;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        const int SPINE_COUNT = ${SHADOW_SPINE_COUNT};
        uniform vec4 uShadowSpine[${SHADOW_SPINE_COUNT}];
        uniform vec2 uFoldAnchor;
        uniform float uCastBlur;
        uniform float uContactTightness;
        uniform vec2 uViewport;
        varying vec2 vWorldXY;

        void main() {
          vec2 p = vWorldXY;

          // Offset down-right from fixed top-left lighting so shadows sit cleanly below the entire bottom edge
          vec2 pCast = p - vec2(0.24, -0.58);
          vec2 pEdge = p - vec2(0.10, -0.22);

          float castField = 0.0;
          float edgeContactField = 0.0;

          for (int i = 0; i < SPINE_COUNT - 1; i++) {
            vec4 sA = uShadowSpine[i];
            vec4 sB = uShadowSpine[i + 1];
            vec2 a = sA.xy;
            vec2 b = sB.xy;
            vec2 ab = b - a;
            float abLenSq = max(dot(ab, ab), 1e-5);

            // 1. Broad continuous cast shadow along entire bottom profile
            vec2 apCast = pCast - a;
            float hCast = clamp(dot(apCast, ab) / abLenSq, 0.0, 1.0);
            vec2 diffCast = apCast - ab * hCast;
            float dCastSq = dot(diffCast, diffCast);
            float proxCast = mix(sA.z, sB.z, hCast);
            float fadeCast = mix(sA.w, sB.w, hCast);
            float sigmaCast = mix(1.06, 0.78, proxCast) * uCastBlur;
            float cVal = exp(-dCastSq / (2.0 * sigmaCast * sigmaCast)) * fadeCast * mix(0.84, 1.06, proxCast);
            castField = max(castField, cVal);

            // 2. Tighter grounding contact shadow hugging the entire bottom edge of the tape
            vec2 apEdge = pEdge - a;
            float hEdge = clamp(dot(apEdge, ab) / abLenSq, 0.0, 1.0);
            vec2 diffEdge = apEdge - ab * hEdge;
            float dEdgeSq = dot(diffEdge, diffEdge);
            float proxEdge = mix(sA.z, sB.z, hEdge);
            float fadeEdge = mix(sA.w, sB.w, hEdge);
            float sigmaEdge = mix(0.28, 0.44, uContactTightness) * mix(1.22, 0.86, proxEdge);
            float eVal = exp(-dEdgeSq / (2.0 * sigmaEdge * sigmaEdge)) * fadeEdge * mix(0.68, 1.0, proxEdge);
            edgeContactField = max(edgeContactField, eVal);
          }

          // 3. Dedicated soft contact pool right under the asynchronously lagged lowest fold bend
          vec2 dFold = p - (uFoldAnchor + vec2(0.16, -0.24));
          float rx = mix(1.30, 1.75, uContactTightness);
          float ry = mix(0.36, 0.58, uContactTightness);
          float foldNormSq = (dFold.x * dFold.x) / (rx * rx) + (dFold.y * dFold.y) / (ry * ry);
          float foldPoolField = exp(-foldNormSq * 1.25);

          // Opacities calibrated for soft studio shadow everywhere along bottom (softens gently at speed)
          float castOpacity = (0.14 / mix(1.0, 1.28, clamp(uCastBlur - 1.0, 0.0, 1.0))) * castField;
          float edgeOpacity = mix(0.115, 0.075, uContactTightness) * edgeContactField;
          float foldOpacity = mix(0.145, 0.095, uContactTightness) * foldPoolField;

          float totalAlpha = 1.0 - (1.0 - castOpacity) * (1.0 - edgeOpacity) * (1.0 - foldOpacity);
          // Same screen-space side fade as the strip, so the shadow fades with it.
          float sx = gl_FragCoord.x / uViewport.x;
          totalAlpha *= smoothstep(0.0, 0.24, sx) * smoothstep(1.0, 0.76, sx);
          if (totalAlpha < 0.002) discard;

          gl_FragColor = vec4(0.05, 0.055, 0.065, totalAlpha);
        }
      `,
    });
  }

  private getSharedSdfChunk(): string {
    return `
      uniform float uScroll;
      uniform vec3 uBgColor;
      uniform float uFrameCount;
      uniform vec2 uViewport;
      varying float vArcCoord;
      varying float vCurveT;
      varying vec2 vRibbonUv;
      varying vec3 vObjNormal;
      varying vec3 vWorldPos;

      float sdRoundedBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
      }

      // Returns vec2(sdf, localYInHole) for top/bottom sprocket rows (6 holes per frame pitch)
      vec2 computeSprocketInfo(float localU, float localV, float cellAspect) {
        float sprocketSlot = fract(localU * 6.0);
        float slotAspect = cellAspect / 6.0;
        float topY = localV - 0.914;
        float botY = localV - 0.086;
        vec2 spTopP = vec2((sprocketSlot - 0.5) * slotAspect, topY);
        vec2 spBotP = vec2((sprocketSlot - 0.5) * slotAspect, botY);
        float spTopD = sdRoundedBox(spTopP, vec2(0.056, 0.048), 0.014);
        float spBotD = sdRoundedBox(spBotP, vec2(0.056, 0.048), 0.014);
        if (spTopD < spBotD) {
          return vec2(spTopD, topY);
        }
        return vec2(spBotD, botY);
      }
    `;
  }

  private createFilmBodyMaterial(): THREE.MeshPhysicalMaterial {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.28,
      metalness: 0.10,
      clearcoat: 0.90,
      clearcoatRoughness: 0.18,
      reflectivity: 0.72,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: true,
    });

    const uniforms = this.uniforms;
    const sharedSdf = this.getSharedSdfChunk();

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uFilmAtlas = uniforms.uFilmAtlas;
      shader.uniforms.uScroll = uniforms.uScroll;
      shader.uniforms.uHoveredFrame = uniforms.uHoveredFrame;
      shader.uniforms.uBgColor = uniforms.uBgColor;
      shader.uniforms.uFrameCount = uniforms.uFrameCount;
      shader.uniforms.uViewport = uniforms.uViewport;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `
          #include <common>
          attribute vec2 aRibbonMeta;
          varying float vArcCoord;
          varying float vCurveT;
          varying vec2 vRibbonUv;
          varying vec3 vObjNormal;
          varying vec3 vWorldPos;
          `
        )
        .replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vArcCoord = aRibbonMeta.x;
          vCurveT = aRibbonMeta.y;
          vRibbonUv = uv;
          vObjNormal = normalize(normal);
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          `
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `
          #include <common>
          uniform sampler2D uFilmAtlas;
          uniform float uHoveredFrame;
          ${sharedSdf}
          `
        )
        .replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>

          float frameCoord = vArcCoord + uScroll;
          float wrapped = mod(frameCoord, uFrameCount);
          float frameIdx = floor(wrapped);
          float localU = fract(wrapped);
          float localV = vRibbonUv.y;

          // Aspect ratio of one cell: framePitch (2.98) / ribbonHeight (2.68) = 1.112
          const float cellAspect = 1.112;

          // Generous rounded-rectangle photo aperture
          vec2 photoP = (vec2(localU, localV) - vec2(0.5, 0.5)) * vec2(cellAspect, 1.0);
          float photoD = sdRoundedBox(photoP, vec2(0.456 * cellAspect, 0.338), 0.052);
          float photoAA = max(fwidth(photoD), 0.0020);
          float photoMask = 1.0 - smoothstep(-photoAA, photoAA, photoD);

          // Sprocket perforation SDF + vertical offset inside hole
          vec2 spInfo = computeSprocketInfo(localU, localV, cellAspect);
          float spD = spInfo.x;
          float spLocalY = spInfo.y;
          float spAA = max(fwidth(spD), 0.0018);
          float holeMask = 1.0 - smoothstep(-spAA, spAA, spD);

          // Discard inside sprocket hole (Pass 2 renders translucent recessed hole with top shadow)
          if (holeMask > 0.50) discard;

          // Symmetric side fade in screen space (same on left and right).
          float edgeSx = gl_FragCoord.x / uViewport.x;
          float staticEdgeFade =
            smoothstep(0.0, 0.24, edgeSx) *
            smoothstep(1.0, 0.76, edgeSx) *
            smoothstep(0.01, 0.09, vCurveT) *
            smoothstep(0.99, 0.91, vCurveT);

          // Photo UV lookup in 4x2 high-res atlas with analytic derivatives (zero seams)
          float uMin = 0.044;
          float uMax = 0.956;
          float vMin = 0.162;
          float vMax = 0.838;
          float photoU = clamp((localU - uMin) / (uMax - uMin), 0.002, 0.998);
          float photoV = clamp((localV - vMin) / (vMax - vMin), 0.002, 0.998);

          float col = mod(frameIdx, 4.0);
          float row = floor(frameIdx / 4.0);
          vec2 atlasUv = vec2((col + photoU) * 0.25, (1.0 - row + photoV) * 0.5);

          vec2 contUv = vec2(frameCoord / (uMax - uMin) * 0.25, localV / (vMax - vMin) * 0.5);
          vec3 photoCol = textureGrad(uFilmAtlas, atlasUv, dFdx(contUv), dFdy(contUv)).rgb;

          float isHovered = 1.0 - step(0.5, abs(frameIdx - uHoveredFrame));
          photoCol *= mix(1.0, 1.055, isHovered);

          // PHOTOS INSET DROP SHADOW: subtle inner shadow along top & left inside the rounded aperture
          // (matches fixed top-left light so each photo looks set into its film frame!)
          float insetDist = max(0.0, -photoD);
          float insetFalloff = exp(-insetDist * 42.0);
          float topLeftWeight =
            clamp(smoothstep(-0.18, 0.26, photoP.y) * 0.72 + smoothstep(0.28, -0.32, photoP.x) * 0.45, 0.15, 1.0);
          float photoInsetShadow = 1.0 - insetFalloff * topLeftWeight * 0.26;
          photoCol *= photoInsetShadow;

          // Subtle bevel around the photo frame cutout on the plastic rail (shadow top-left, catchlight bottom-right)
          float frameRim = smoothstep(0.016, 0.0, abs(photoD)) * (1.0 - photoMask);
          float frameRimHighlight = frameRim * smoothstep(0.15, -0.25, photoP.y);
          float frameRimShadow = frameRim * smoothstep(-0.15, 0.25, photoP.y);

          // SPROCKET RIM MICRO-SHADING: small inner shadow on top edge, faint highlight on bottom edge
          float spRim = smoothstep(0.014, 0.0, abs(spD)) * (1.0 - holeMask);
          float spTopShadow = spRim * smoothstep(-0.01, 0.038, spLocalY);
          float spBottomHighlight = spRim * smoothstep(0.01, -0.038, spLocalY);

          // FIXED TOP-LEFT DIRECTIONAL CURVE SHADING:
          // Up-facing surfaces are bright, down-facing surfaces are dark; soft grey gradient follows the curve
          vec3 fixedLightDir = normalize(vec3(-0.55, 0.72, 0.42));
          vec3 surfN = gl_FrontFacing ? normalize(vObjNormal) : -normalize(vObjNormal);
          float curveLight = dot(surfN, fixedLightDir) * 0.5 + 0.5;
          float verticalCurveGrad = mix(0.76, 1.12, smoothstep(0.0, 1.0, localV));
          float softCurveShade = mix(0.68, 1.08, smoothstep(0.12, 0.92, curveLight)) * verticalCurveGrad;

          // MIDDLE FOLD DARKNESS:
          // Inner concave side ~22-28% brightness, outer curved edge stays bright
          float foldRegion = smoothstep(0.35, 0.43, vCurveT) * (1.0 - smoothstep(0.56, 0.65, vCurveT));
          float innerConcave = clamp(-vObjNormal.x * 0.9 + (1.0 - abs(vObjNormal.z)) * 0.35, 0.0, 1.0);
          float innerCrease = smoothstep(0.39, 0.45, vCurveT) * (1.0 - smoothstep(0.49, 0.54, vCurveT));
          float foldDarkness = mix(1.0, 0.24, max(foldRegion * smoothstep(0.18, 0.85, innerConcave), innerCrease * 0.92));

          // Bright outer edge of the fold (top/outer rim catches top-left light)
          float outerEdgeBright = smoothstep(0.46, 0.498, abs(localV - 0.5));

          // Base glossy silver-grey plastic acetate rail
          vec3 frontRailCol = vec3(0.35, 0.362, 0.382) * softCurveShade;
          frontRailCol += vec3(0.20, 0.21, 0.22) * outerEdgeBright;
          frontRailCol = mix(frontRailCol, vec3(0.14, 0.15, 0.17), frameRimShadow * 0.45);
          frontRailCol += vec3(0.18, 0.19, 0.20) * frameRimHighlight * 0.38;
          frontRailCol = mix(frontRailCol, vec3(0.10, 0.11, 0.13), spTopShadow * 0.55);
          frontRailCol += vec3(0.22, 0.23, 0.25) * spBottomHighlight * 0.48;

          // Backface inside the fold: ~25% dark inner side transitioning to bright outer sprocket edge
          vec3 backRailCol = vec3(0.22, 0.23, 0.25) * mix(0.65, 1.15, smoothstep(0.46, 0.57, vCurveT));
          backRailCol += vec3(0.28, 0.29, 0.30) * outerEdgeBright;
          backRailCol = mix(backRailCol, vec3(0.08, 0.09, 0.10), spTopShadow * 0.45);
          backRailCol += vec3(0.18, 0.19, 0.20) * spBottomHighlight * 0.40;
          vec3 backInnerCol = vec3(0.032, 0.035, 0.040);
          vec3 backBase = mix(backRailCol, backInnerCol, photoMask);

          vec3 surfaceCol;
          if (gl_FrontFacing) {
            vec3 shadedPhoto = photoCol * mix(1.0, foldDarkness, 0.82);
            vec3 shadedRail = frontRailCol * foldDarkness;
            surfaceCol = mix(shadedRail, shadedPhoto, photoMask);
          } else {
            surfaceCol = backBase;
          }

          // Dissolve smoothly into the gallery background at fixed left & right sides
          surfaceCol = mix(uBgColor, surfaceCol, smoothstep(0.0, 0.72, staticEdgeFade));

          diffuseColor.rgb = surfaceCol;
          diffuseColor.a = staticEdgeFade;
          if (diffuseColor.a < 0.015) discard;
          `
        )
        .replace(
          '#include <emissivemap_fragment>',
          `
          #include <emissivemap_fragment>

          // FIXED WORLD-SPACE GLOSSY PLASTIC SHINE ("Light never moves, only the tape does.")
          // Thin, blurry, diagonal white band (~40-60% opacity) on top curves & sprocket rims, zero hard edges.
          // Because this band is fixed in world space (vWorldPos), frames & sprockets visibly glide
          // straight through the shine as the tape scrolls!
          vec3 viewDirW = normalize(cameraPosition - vWorldPos);
          vec3 surfNormW = gl_FrontFacing ? normalize(vObjNormal) : -normalize(vObjNormal);
          float ndotv = clamp(dot(surfNormW, viewDirW), 0.0, 1.0);

          // Fixed top-left softbox specular alignment
          vec3 lightTopLeft = normalize(vec3(-0.55, 0.72, 0.42));
          vec3 halfTopLeft = normalize(lightTopLeft + viewDirW);
          float plasticSpec = pow(max(dot(surfNormW, halfTopLeft), 0.0), 18.0);

          // World-fixed thin, blurry diagonal white light bands (Gaussian falloff = zero hard edges!)
          float diagCoord = vWorldPos.x * 0.46 - vWorldPos.y * 0.88;
          // Primary diagonal band sweeping across the upper-left curve & top foreground curve
          float band1 = exp(-pow((diagCoord + 2.15) / 0.52, 2.0));
          // Secondary diagonal band catching the sweeping right upper curve & sprocket rim
          float band2 = exp(-pow((diagCoord - 1.35) / 0.56, 2.0));
          // Subtle crest band catching the upper bend lip
          float band3 = exp(-pow((diagCoord + 0.15) / 0.42, 2.0));

          float diagonalBand = clamp(band1 + band2 * 0.92 + band3 * 0.75, 0.0, 1.0);

          // Bias glossy band toward top curves & top/bottom sprocket rims, with delicate glaze across photos
          float topCurveBias = smoothstep(0.28, 0.96, localV);
          float sprocketRimZone = max(smoothstep(0.78, 0.97, localV), smoothstep(0.20, 0.03, localV) * 0.45);
          float railMask = 1.0 - photoMask;

          // ~40-58% glossy white plastic sheen on top curves & sprocket rims, subtle ~18% glaze across photos
          float shineOnRail = diagonalBand * mix(0.22, 0.56, max(topCurveBias, sprocketRimZone)) + plasticSpec * 0.16;
          float shineOnPhoto = diagonalBand * mix(0.08, 0.22, topCurveBias) + plasticSpec * 0.06;

          // Keep the deep concave inner fold dark while letting the outer curve & frames shine
          float shineMask = mix(1.0, 0.22, innerCrease) * staticEdgeFade;

          if (gl_FrontFacing) {
            totalEmissiveRadiance += diffuseColor.rgb * photoMask * 0.09;
            float glossyWhite = mix(shineOnRail, shineOnPhoto, photoMask) * shineMask;
            totalEmissiveRadiance += vec3(0.96, 0.98, 1.0) * glossyWhite;
          } else {
            // Faint blurry glossy highlight along the outer top edge of the curving return fold
            float backEdgeShine = (diagonalBand * 0.34 * topCurveBias + pow(1.0 - ndotv, 3.0) * 0.18) * staticEdgeFade;
            totalEmissiveRadiance += vec3(0.92, 0.94, 0.98) * backEdgeShine * railMask;
          }
          `
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `
          #include <roughnessmap_fragment>
          if (gl_FrontFacing) {
            roughnessFactor = mix(0.26, 0.15, photoMask);
          } else {
            roughnessFactor = mix(0.28, 0.22, photoMask);
          }
          `
        );
    };

    return mat;
  }

  /**
   * Pass 2 Material: Soft recessed translucent sprocket perforations with subtle top inner shadow
   * and faint bottom edge highlight matching top-left lighting.
   */
  private createSprocketMembraneMaterial(): THREE.MeshPhysicalMaterial {
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.52,
      metalness: 0.0,
      clearcoat: 0.15,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });

    const uniforms = this.uniforms;
    const sharedSdf = this.getSharedSdfChunk();

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uScroll = uniforms.uScroll;
      shader.uniforms.uBgColor = uniforms.uBgColor;
      shader.uniforms.uFrameCount = uniforms.uFrameCount;
      shader.uniforms.uViewport = uniforms.uViewport;

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `
          #include <common>
          attribute vec2 aRibbonMeta;
          varying float vArcCoord;
          varying float vCurveT;
          varying vec2 vRibbonUv;
          varying vec3 vObjNormal;
          varying vec3 vWorldPos;
          `
        )
        .replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vArcCoord = aRibbonMeta.x;
          vCurveT = aRibbonMeta.y;
          vRibbonUv = uv;
          vObjNormal = normalize(normal);
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          `
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `
          #include <common>
          ${sharedSdf}
          `
        )
        .replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>

          float frameCoord = vArcCoord + uScroll;
          float wrapped = mod(frameCoord, uFrameCount);
          float localU = fract(wrapped);
          float localV = vRibbonUv.y;

          const float cellAspect = 1.112;
          vec2 spInfo = computeSprocketInfo(localU, localV, cellAspect);
          float spD = spInfo.x;
          float spLocalY = spInfo.y;
          float spAA = max(fwidth(spD), 0.0018);
          float holeMask = 1.0 - smoothstep(-spAA, spAA, spD);

          if (holeMask < 0.05) discard;

          // Static horizontal side fade mask (~8-10% soft dissolve into #ECECEC on both sides)
          // Symmetric side fade in screen space (same on left and right).
          float edgeSx = gl_FragCoord.x / uViewport.x;
          float staticEdgeFade =
            smoothstep(0.0, 0.24, edgeSx) *
            smoothstep(1.0, 0.76, edgeSx) *
            smoothstep(0.01, 0.09, vCurveT) *
            smoothstep(0.99, 0.91, vCurveT);

          // Soft neutral recessed sprocket holes: subtly darker than bright silver rail,
          // and visibly lighter (#B8B8BC-#C8C8CB look) inside the dark curved fold
          float topInnerShadow = smoothstep(-0.02, 0.044, spLocalY);
          vec3 frontHoleCol = mix(vec3(0.56, 0.57, 0.59), vec3(0.32, 0.33, 0.35), topInnerShadow);
          vec3 backHoleCol = mix(vec3(0.46, 0.47, 0.49), vec3(0.28, 0.29, 0.31), topInnerShadow);

          diffuseColor.rgb = gl_FrontFacing ? frontHoleCol : backHoleCol;
          float holeAlpha = gl_FrontFacing ? mix(0.68, 0.78, topInnerShadow) : 0.76;
          diffuseColor.a = holeMask * holeAlpha * staticEdgeFade;
          if (diffuseColor.a < 0.01) discard;
          `
        );
    };

    return mat;
  }

  /**
   * Fits the camera to the box. Like the prototype the strip runs off both sides
   * of the screen; the closest camera is picked where every part of the strip
   * that is on screen (horizontally) stays within FIT_HEIGHT of the box height,
   * and the centre fold fits the width. Same viewing angle as the prototype
   * (camera slightly above, looking down); only distance and aim change.
   */
  private fitCamera(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    const pos = this.ribbon.geometry.attributes.position as THREE.BufferAttribute;
    const pts: THREE.Vector3[] = [];
    // Every 2nd column, both edges (vertices alternate bottom / top).
    for (let i = 0; i < pos.count; i++) {
      if (i % 4 > 1) continue;
      pts.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)));
    }
    if (!pts.length) return;
    // Room for the scroll waves and pointer parallax.
    const wave = 0.26;
    const tilt = (1.72 - 0.44) / 13.2; // prototype camera height per unit distance
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const ndc = new THREE.Vector3();

    const place = (d: number, lookY: number) => {
      this.camera.position.set(0.08, lookY + tilt * d, d);
      this.camera.lookAt(0.04, lookY, 0);
      this.camera.updateMatrixWorld();
    };
    // On-screen vertical extent (NDC) of the strip for a camera, and whether the fold fits.
    const measure = (d: number, lookY: number) => {
      place(d, lookY);
      let lo = Infinity;
      let hi = -Infinity;
      let foldOk = true;
      for (const p of pts) {
        for (const dy of [-wave, wave]) {
          ndc.set(p.x, p.y + dy, p.z).project(this.camera);
          if (Math.abs(p.x) < 3.4 && Math.abs(ndc.x) > 0.96) foldOk = false;
          // Off screen at the sides, or already mostly faded out (edge fade 5.5–8.4).
          if (Math.abs(ndc.x) > 1.02 || Math.abs(p.x) > 6.6) continue;
          lo = Math.min(lo, ndc.y);
          hi = Math.max(hi, ndc.y);
        }
      }
      return { lo, hi, foldOk };
    };
    // Aim so the visible strip is centred, then check it fits.
    const solve = (d: number) => {
      let lookY = 0.44;
      let m = measure(d, lookY);
      for (let k = 0; k < 4; k++) {
        lookY += ((m.hi + m.lo) / 2) * d * tanHalf;
        m = measure(d, lookY);
      }
      return { lookY, ok: m.foldOk && (m.hi - m.lo) / 2 <= FIT_HEIGHT };
    };

    let lo = 9;
    let hi = 60;
    for (let k = 0; k < 22; k++) {
      const mid = (lo + hi) / 2;
      if (solve(mid).ok) hi = mid;
      else lo = mid;
    }
    const { lookY } = solve(hi);
    this.camDist = hi;
    this.camLookY = lookY;
    this.camBaseY = lookY + tilt * hi;
    place(hi, lookY);
    // Fog follows the camera distance (prototype: 15.5–27 at distance 13.2).
    const fog = this.scene.fog as THREE.Fog;
    fog.near = hi + 2.3;
    fog.far = hi + 13.8;
  }

  /** Page scroll position in px (any origin); scrolling down runs the strip forward. */
  public setScrollPx(px: number): void {
    if (this.lastScrollPx !== null) {
      this.targetScroll += (px - this.lastScrollPx) * SCROLL_PER_PX;
    }
    this.lastScrollPx = px;
  }

  public jumpToFrame(frameIndex: number): void {
    const heroSlotOffset = 5.45;
    const count = 8;
    const desiredMod = (((frameIndex - heroSlotOffset) % count) + count) % count;
    const currentMod = ((this.targetScroll % count) + count) % count;
    let diff = desiredMod - currentMod;
    if (diff > count * 0.5) diff -= count;
    if (diff < -count * 0.5) diff += count;
    this.targetScroll += diff;
  }

  private computeFrameIndexAtHit(hitUvX: number): number {
    const arcUnits = (hitUvX * this.ribbon.totalArcLength) / this.ribbon.framePitch;
    const frameCoord = arcUnits + this.currentScroll;
    const count = 8;
    return ((Math.floor(frameCoord) % count) + count) % count;
  }

  private raycastRibbon(clientX: number, clientY: number): number | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    _raycaster.setFromCamera(_ndc, this.camera);
    const hits = _raycaster.intersectObject(this.ribbonMesh, false);
    if (hits.length === 0) return null;

    for (const hit of hits) {
      if (!hit.uv) continue;
      if (hit.uv.x < 0.03 || hit.uv.x > 0.97) continue;
      if (hit.face && hit.face.normal) {
        return this.computeFrameIndexAtHit(hit.uv.x);
      }
    }
    return null;
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height);
    this.renderer.getDrawingBufferSize(this.uniforms.uViewport.value);
    this.fitCamera(width / height);
  }

  private handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.dragMoved = false;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.lastDragX = e.clientX;
    this.lastDragY = e.clientY;
    this.renderer.domElement.style.cursor = 'grabbing';
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.inView || this.container.closest('[data-off]')) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.pointerTargetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointerTargetY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    }

    if (this.isDragging) {
      const dx = e.clientX - this.lastDragX;
      const dy = e.clientY - this.lastDragY;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;

      const totalMove = Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY);
      if (totalMove > 6) {
        this.dragMoved = true;
      }

      const delta = (-dx * 0.72 + dy * 0.42) * 0.0048;
      this.targetScroll += delta;
      return;
    }

    const now = performance.now();
    if (now - this.lastHoverRaycastTime < 34) return;
    this.lastHoverRaycastTime = now;

    const hitFrame = this.raycastRibbon(e.clientX, e.clientY);
    if (hitFrame !== this.hoveredFrame) {
      this.hoveredFrame = hitFrame;
      this.uniforms.uHoveredFrame.value = hitFrame === null ? -1.0 : hitFrame;
      this.renderer.domElement.style.cursor = hitFrame !== null ? 'pointer' : 'grab';
      this.callbacks.onHoverFrameChange?.(hitFrame);
    }
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    this.renderer.domElement.style.cursor = this.hoveredFrame !== null ? 'pointer' : 'grab';

    if (!this.dragMoved) {
      const clicked = this.raycastRibbon(e.clientX, e.clientY);
      if (clicked !== null) {
        this.callbacks.onSelectFrame?.(clicked);
      }
    }
  }

  private handlePointerLeave(): void {
    if (!this.isDragging) {
      this.hoveredFrame = null;
      this.uniforms.uHoveredFrame.value = -1.0;
      this.callbacks.onHoverFrameChange?.(null);
    }
  }

  private handleContextLost(e: Event): void {
    e.preventDefault();
    this.contextLost = true;
    this.callbacks.onContextLost?.(true);
  }

  private handleContextRestored(): void {
    this.contextLost = false;
    this.callbacks.onContextLost?.(false);
    this.startLoop();
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed || this.contextLost) return;

      // Hidden page in the capabilities story, or section off screen: idle cheaply.
      if (!this.inView || this.container.closest('[data-off]')) {
        this.lastTime = performance.now();
        this.frameId = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.elapsedTime += dt;

      // Silky ease-in-out exponential inertia on scroll
      const prevScroll = this.currentScroll;
      this.currentScroll = THREE.MathUtils.damp(this.currentScroll, this.targetScroll, 4.4, dt);

      const rawVel = (this.currentScroll - prevScroll) / dt;
      this.scrollVelocity = THREE.MathUtils.damp(this.scrollVelocity, rawVel, 6.2, dt);

      this.uniforms.uScroll.value = this.currentScroll;

      const heroArc = 5.45;
      const count = 8;
      const nextActive = ((Math.floor(heroArc + this.currentScroll) % count) + count) % count;
      if (nextActive !== this.activeFrame) {
        this.activeFrame = nextActive;
        this.callbacks.onActiveFrameChange?.(nextActive);
      }

      const waveStrength = this.reducedMotion ? 0.08 : WAVE_STRENGTH;
      this.ribbon.updateGeometry(
        this.elapsedTime,
        this.scrollVelocity,
        this.currentScroll,
        waveStrength
      );

      // Subtle cinematic pointer parallax (computed before shadow projection for zero jitter)
      this.pointerX = THREE.MathUtils.damp(this.pointerX, this.pointerTargetX, 3.6, dt);
      this.pointerY = THREE.MathUtils.damp(this.pointerY, this.pointerTargetY, 3.6, dt);
      const parallaxScale = this.reducedMotion ? 0 : 1;
      this.camera.position.x = 0.08 + this.pointerX * 0.28 * parallaxScale;
      this.camera.position.y = this.camBaseY + this.pointerY * 0.16 * parallaxScale;
      this.camera.position.z = this.camDist;
      this.camera.lookAt(0.04, this.camLookY, 0);

      // Update async lagged bottom shadow everywhere along the live ribbon bottom silhouette
      this.laggedScroll = THREE.MathUtils.damp(this.laggedScroll, this.currentScroll, 1.55, dt);
      this.laggedVelocity = THREE.MathUtils.damp(this.laggedVelocity, this.scrollVelocity, 1.75, dt);

      const speedMag = Math.abs(this.scrollVelocity);
      const laggedSpeed = Math.abs(this.laggedVelocity);
      const scrollLagDelta = THREE.MathUtils.clamp(
        this.currentScroll - this.laggedScroll,
        -1.6,
        1.6
      );

      this.castBlurFactor = THREE.MathUtils.damp(
        this.castBlurFactor,
        1.0 + Math.min(0.48, Math.max(speedMag, laggedSpeed) * 0.24),
        2.6,
        dt
      );

      const targetTightness = THREE.MathUtils.clamp(
        this.ribbon.foldElevationFactor * 0.55 + Math.min(0.45, laggedSpeed * 0.25),
        0,
        1
      );
      this.contactTightness = THREE.MathUtils.damp(this.contactTightness, targetTightness, 3.2, dt);

      const camPos = this.camera.position;
      const posAttr = this.ribbon.geometry.attributes.position as THREE.BufferAttribute;
      const segs = this.ribbon.segments;
      const spineUniforms = this.shadowUniforms.uShadowSpine.value;
      const asyncMotionScale = this.reducedMotion ? 0.1 : 1.0;

      for (let k = 0; k < SHADOW_SPINE_COUNT; k++) {
        const s = 0.02 + (k / (SHADOW_SPINE_COUNT - 1)) * 0.96;
        const segIdx = Math.round(s * segs);
        const bottomVertexIdx = segIdx * 2;
        const rx = posAttr.getX(bottomVertexIdx);
        const ry = posAttr.getY(bottomVertexIdx);
        const rz = posAttr.getZ(bottomVertexIdx);

        // Project exact live bottom-edge point onto z = -3.8 backdrop plane
        const tProj = (-3.8 - camPos.z) / Math.min(-0.1, rz - camPos.z);
        const projX = camPos.x + (rx - camPos.x) * tProj;
        const projY = camPos.y + (ry - camPos.y) * tProj;

        // Asynchronous trailing wave & inertial lag along the bottom shadow during motion
        const wingWeight = 0.35 + 0.65 * Math.min(1, Math.abs(s - 0.5) * 2.4);
        const asyncPhase = s * Math.PI * 3.4 - this.laggedScroll * 1.35 - 0.75;
        const asyncWaveY =
          Math.sin(asyncPhase) * laggedSpeed * 0.24 * wingWeight * asyncMotionScale;
        const asyncDropY = -Math.min(0.32, laggedSpeed * 0.14) * wingWeight * asyncMotionScale;
        const asyncTrailX =
          THREE.MathUtils.clamp(
            -scrollLagDelta * 0.42 - this.laggedVelocity * 0.18,
            -0.85,
            0.85
          ) *
          wingWeight *
          asyncMotionScale;

        const targetX = projX + asyncTrailX;
        const targetY = projY + asyncWaveY + asyncDropY;

        // Proximity (0 = back arm, 1 = foreground fold/right arm) & static side edge fade
        const prox = THREE.MathUtils.clamp((rz + 1.85) / 3.6, 0, 1);
        const edgeFade =
          smoothstep(-8.4, -5.5, rx) *
          smoothstep(8.4, 5.5, rx) *
          smoothstep(0.01, 0.09, s) *
          smoothstep(0.99, 0.91, s);

        const entry = spineUniforms[k];
        if (!this.shadowSpineInitialized) {
          entry.set(targetX, targetY, prox, edgeFade);
        } else {
          // Staggered slower inertia on wings vs fold creates true asynchronous shadow follow
          const pointLambda = 2.55 - 1.0 * wingWeight;
          entry.x = THREE.MathUtils.damp(entry.x, targetX, pointLambda, dt);
          entry.y = THREE.MathUtils.damp(entry.y, targetY, pointLambda, dt);
          entry.z = THREE.MathUtils.damp(entry.z, prox, 3.0, dt);
          entry.w = edgeFade;
        }
      }

      // Project & asynchronously lag the foreground fold's lowest contact anchor
      _projVec.copy(this.ribbon.foldContactAnchor);
      const tPlane = (-3.8 - camPos.z) / Math.min(-0.1, _projVec.z - camPos.z);
      const anchorX =
        camPos.x +
        (_projVec.x - camPos.x) * tPlane +
        THREE.MathUtils.clamp(-scrollLagDelta * 0.24, -0.45, 0.45) * asyncMotionScale;
      const anchorY =
        camPos.y +
        (_projVec.y - camPos.y) * tPlane -
        Math.min(0.18, laggedSpeed * 0.08) * asyncMotionScale;

      if (!this.shadowSpineInitialized) {
        this.laggedFoldX = anchorX;
        this.laggedFoldY = anchorY;
        this.shadowSpineInitialized = true;
      } else {
        this.laggedFoldX = THREE.MathUtils.damp(this.laggedFoldX, anchorX, 2.0, dt);
        this.laggedFoldY = THREE.MathUtils.damp(this.laggedFoldY, anchorY, 2.0, dt);
      }

      this.shadowUniforms.uFoldAnchor.value.set(this.laggedFoldX, this.laggedFoldY);
      this.shadowUniforms.uCastBlur.value = this.castBlurFactor;
      this.shadowUniforms.uContactTightness.value = this.contactTightness;

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResizeBound);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDownBound);
    window.removeEventListener('pointermove', this.handlePointerMoveBound);
    window.removeEventListener('pointerup', this.handlePointerUpBound);
    dom.removeEventListener('pointerleave', this.handlePointerLeaveBound);
    dom.removeEventListener('webglcontextlost', this.handleContextLostBound);
    dom.removeEventListener('webglcontextrestored', this.handleContextRestoredBound);

    this.ribbon.dispose();
    this.atlas.dispose();
    this.bodyMaterial.dispose();
    this.sprocketMaterial.dispose();
    this.backdropShadowGeometry.dispose();
    this.backdropShadowMaterial.dispose();
    this.envRenderTarget.dispose();
    this.renderer.dispose();

    if (dom.parentNode === this.container) {
      this.container.removeChild(dom);
    }
  }
}
