import type { TearConfig } from "./tear.config";

/**
 * CPU copy of the torn contour in src/shaders/tear.frag, used to clip the coded
 * hero (DOM) along the same line the shader draws the paper lip on. The canvas
 * is transparent above the lip, so the hero shows through it; below the lip the
 * hero is clipped away and the white page underneath shows.
 * Keep the maths here in sync with tear.frag (snoise, tearProfile, edgeVary,
 * lip and shear border).
 */

// GLSL mod / fract (JS % keeps the sign of the dividend, GLSL mod does not).
const mod = (x: number, y: number) => x - y * Math.floor(x / y);
const fract = (x: number) => x - Math.floor(x);
const permute = (x: number) => mod((x * 34 + 1) * x, 289);

const C0 = 0.211324865405187;
const C1 = 0.366025403784439;
const C2 = -0.577350269189626;
const C3 = 0.024390243902439;

/** 2D simplex noise, same as snoise() in tear.frag. */
export function snoise(vx: number, vy: number) {
  const s = (vx + vy) * C1;
  let ix = Math.floor(vx + s);
  let iy = Math.floor(vy + s);
  const t = (ix + iy) * C0;
  const x0x = vx - ix + t;
  const x0y = vy - iy + t;
  const i1x = x0x > x0y ? 1 : 0;
  const i1y = x0x > x0y ? 0 : 1;
  const x1x = x0x + C0 - i1x;
  const x1y = x0y + C0 - i1y;
  const x2x = x0x + C2;
  const x2y = x0y + C2;
  ix = mod(ix, 289);
  iy = mod(iy, 289);
  const p0 = permute(permute(iy) + ix);
  const p1 = permute(permute(iy + i1y) + ix + i1x);
  const p2 = permute(permute(iy + 1) + ix + 1);

  let m0 = Math.max(0.5 - (x0x * x0x + x0y * x0y), 0);
  let m1 = Math.max(0.5 - (x1x * x1x + x1y * x1y), 0);
  let m2 = Math.max(0.5 - (x2x * x2x + x2y * x2y), 0);
  m0 = m0 * m0 * m0 * m0;
  m1 = m1 * m1 * m1 * m1;
  m2 = m2 * m2 * m2 * m2;

  const g = (p: number, m: number, px: number, py: number) => {
    const x = 2 * fract(p * C3) - 1;
    const h = Math.abs(x) - 0.5;
    const a0 = x - Math.floor(x + 0.5);
    return m * (1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h)) * (a0 * px + h * py);
  };
  return 130 * (g(p0, m0, x0x, x0y) + g(p1, m1, x1x, x1y) + g(p2, m2, x2x, x2y));
}

function edgeVary(x: number, m: number, seed: number) {
  return (
    snoise(x * 1.6 + seed, m * 0.35 + seed * 1.7) * 0.6 +
    snoise(x * 4.4 - seed * 2.3, m * 0.6 + seed) * 0.4
  );
}

function tearProfile(x: number, m: number, amp: number, rSize: number) {
  const broad =
    snoise(x * 0.85 + 0.42, m * 0.3 + 1.18) * amp +
    snoise(x * 2.1 + 2.15, m * 0.55 + 3.42) * amp * 0.45;
  const cleft = Math.pow(Math.max(snoise(x * 1.55 - 1.95, m * 0.45 + 2.3), 0), 2) * amp * 0.9;
  const ridges =
    snoise(x * 5.0 + 0.7, m * 1.0 + 5.3) * rSize * 0.8 +
    snoise(x * 11.0 + 4.1, m * 1.4 + 7.8) * rSize * 0.35 +
    snoise(x * 24.0 + 1.9, m * 1.8 + 9.2) * rSize * 0.12;
  return broad - cleft + ridges;
}

/**
 * CSS clip-path polygon (px, element = viewport-sized layer) that keeps only the
 * part of the hero above the shear border of the paper lip.
 */
export function heroClipPath(
  w: number,
  h: number,
  tear: number,
  progress: number,
  time: number,
  config: TearConfig,
  step = 6,
) {
  const { edge, motion } = config;
  const aspect = w / Math.max(h, 1);
  const spread = Math.max(edge.ridgeSpread, 0.2);
  const rSize = Math.max(edge.ridgeSize, 0.003);
  const amp = Math.max(edge.amplitude, 0);
  const variation = Math.min(Math.max(edge.variation, 0), 1);
  const fiberFreq = Math.max(edge.roughness, 0.5) / 2.8;
  const aa = 1 / Math.max(h, 1);
  const morph =
    progress * edge.morph +
    (motion.autoEdgeMovement ? 1 : 0) *
      motion.edgeMovementIntensity *
      time *
      motion.edgeSpeed *
      0.15;

  const pts: string[] = ["0px 0px", `${w}px 0px`];
  const count = Math.max(Math.ceil(w / step), 1);
  for (let k = count; k >= 0; k--) {
    const x = Math.min(k * step, w);
    const xScaled = ((x / w) * aspect) / spread;
    const profile = tearProfile(xScaled, morph, amp, rSize);
    const lipVary = Math.max(1 + variation * 0.75 * edgeVary(xScaled, morph, 8.1), 0.25);
    const lip = Math.max(edge.lipWidth, 0.006) * lipVary;
    const innerLumps =
      snoise(x * 0.018 * fiberFreq - 23, morph * 1.8 + 13) * 0.65 +
      snoise(x * 0.045 * fiberFreq + 7, morph * 2.4 + 17) * 0.35;
    const shearBorder = -lip * 0.35 * innerLumps;
    const fuzz = lip * 0.3 + 2 * aa;
    // Just inside the opaque lip, so no sliver of hero shows under the paper edge.
    const clipUv = tear + profile + shearBorder + fuzz;
    const y = (1 - clipUv) * h;
    pts.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`);
  }
  return `polygon(${pts.join(", ")})`;
}
