/**
 * ─────────────────────────────────────────────────────────────
 *  HERO PAPER-TEAR — TUNING
 *  Edit values here; the dev server hot-reloads them.
 *  Shader defaults come from paper-tearing-animation FACTORY_PARAMS.
 * ─────────────────────────────────────────────────────────────
 */

export const tearConfig = {
  /** Images. w/h are the real pixel sizes of the files. */
  images: {
    /** shiftUp: share of the banner height cropped off the top, moves the art up (0–0.3). */
    banner: {
      src: "/images/hero/pop-banner.webp",
      w: 3024,
      h: 2364,
      shiftUp: 0.13,
    },
    quilt: { src: "/images/hero/quilt.webp", w: 2268, h: 3093 },
  },

  /** Where the white page starts on load, and how the scroll drives the tear. */
  layout: {
    /**
     * Tear line on load, in screen heights from the bottom. Small positive = a strip of
     * the white edge peeks in at the bottom. Negative = hidden until the user scrolls.
     */
    start: 0.05,
    /** Tear line when finished, in screen heights from the bottom (>1 = above the top edge). */
    end: 1.14,
    /** Scroll distance of the whole tear, in screen heights. Higher = slower tear. */
    pinLength: 1.1,
    /** Extra easing on top of smooth scroll. 0 = follows scroll exactly, 0.9 = very floaty. */
    smoothing: 0.12,
  },

  /** Torn edge look (shader uniforms). */
  edge: {
    /** Width of the white paper lip (0.01–0.08). */
    lipWidth: 0.022,
    /** Big wave height of the tear line (0.02–0.2). */
    amplitude: 0.045,
    /** Height of the small ridges (0.005–0.06). */
    ridgeSize: 0.012,
    /** Horizontal spacing of ridges; higher = wider, calmer waves (0.4–4). */
    ridgeSpread: 1.5,
    /** Fine paper grain frequency (1–6). */
    roughness: 2.8,
    /** How far fibre flecks scatter above the edge (0–0.08). */
    rashSpread: 0.03,
    /** How many fibre flecks appear (0–1). */
    rashDensity: 0.6,
    /** How far flecks spread into the lip and the white page (0–0.08). */
    rashInner: 0.02,
    /** How much lip width and flecks vary along the edge (0–1). */
    variation: 0.7,
    /** How much the contour changes shape over the full tear (0 = fixed shape). */
    morph: 3.2,
    /** Paper colour. */
    paperColor: "#ffffff",
  },

  /** Page movement during the tear. */
  motion: {
    /**
     * Banner drifts up slowly while the white edge rises.
     * bannerTravel: how far it moves up in total, in screen heights (0 = fully static).
     * bannerStopAt: tear height where it stops moving (1.14 = spread over the whole tear, slowest).
     */
    bannerTravel: 0.08,
    bannerStopAt: 1.14,
    /**
     * Blank white gap kept between the torn edge and the top of the radio / bubbles,
     * in screen heights. The assets slide up behind the edge at this distance and
     * settle once the edge has passed their spot. Higher = more white first.
     */
    assetsGap: 0.14,
    /** How far below its final spot the white page starts, rising into place (0–1). */
    lowerScroll: 0.45,
    /** Gentle edge shimmer while idle. */
    autoEdgeMovement: false,
    edgeMovementIntensity: 0.8,
    edgeSpeed: 0.8,
  },

  /** Rendering quality. */
  quality: {
    /** Max device pixel ratio for the WebGL canvas. 2 = sharp on Retina; 1 = faster. */
    maxPixelRatio: 2,
  },
} as const;

export type TearConfig = typeof tearConfig;

/** Shader progress 0..1 from tear height (inverse of the repo's mix(-0.14, 1.14, progress)). */
export const progressFromTear = (tear: number) => (tear + 0.14) / 1.28;
