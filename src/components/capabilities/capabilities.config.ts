import type { ToolSlug } from "@/components/tool/tools.config";

/**
 * ─────────────────────────────────────────────────────────────
 *  CAPABILITIES STORY — CONTENT & TUNING
 *  One pinned section. The tab row stays still while each scroll step swaps
 *  the page: "side" = old page exits left / new enters right (with fades),
 *  "up" = new page pushes up from the bottom (no fades).
 *  Order of the steps lives in src/app/page.tsx.
 * ─────────────────────────────────────────────────────────────
 */

export type CapabilityPageData = {
  title: string;
  body: string;
  /** Image above the headline. null = soft glow placeholder. */
  icon: { src: string; w: number; h: number } | null;
  /** Colour of the soft glow behind the icon. */
  glow?: string;
};

export type ToolIcon = {
  src: string;
  w: number;
  h: number;
  alt: string;
  /** Opens /tool/<slug> (see src/components/tool/tools.config.ts). Omit = not clickable. */
  slug?: ToolSlug;
};

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud Lorem ipsum dolor s, quis nostrudLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud Lorem ipsum dolor s, quis nostrud";

export const capabilitiesConfig = {
  /** Tab row labels. */
  tabs: ["Visuals", "AI", "Design system", "Content"],

  visual: {
    title: "Visual design",
    body: LOREM,
    icon: { src: "/images/hero/vidual-design.svg", w: 241, h: 249 },
  } satisfies CapabilityPageData,

  ai: {
    title: "AI in design",
    body: LOREM,
    icon: { src: "/images/capabilities/ai-orb.png", w: 936, h: 936 },
    glow: "rgba(255, 70, 40, 0.28)",
  } satisfies CapabilityPageData,

  designSystem: {
    title: "Design system",
    body: LOREM,
    icon: { src: "/system-design.svg", w: 271, h: 247 },
  } satisfies CapabilityPageData,

  agentic: {
    title: "Agentic commerce",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud",
  },

  /**
   * Agentic commerce phone page: five 3D POPgenie phones, ported from the
   * prototype (index.html, assets in /images/genie). The centre phone rises in
   * with the page; the other four slide out from behind it on the next scroll.
   */
  phones: {
    alt: "POPgenie shopping assistant on five phones",
    /** Width of the phone group (outer phone edge to edge). */
    width: "min(52vw, 95vh)",
    /** Asset folder: front-<id>.webp, screen-<id>.webp, phone-geo.json, screenmask.png. */
    dir: "/images/genie",
    /**
     * Prototype frame px (3024x1902 comp): cx = centre x, top = top edge,
     * s = scale of the 577x1042 phone model, wall = rgb of the phone sides.
     * ring 0 = centre, 1 = inner pair (out first), 2 = outer pair (a bit later).
     * side = -1 left / 1 right. Listed back to front.
     */
    list: [
      { id: "silver", cx: 745, top: 890, s: 0.7375, ring: 2, side: -1, wall: [0.58, 0.58, 0.58] },
      { id: "dark", cx: 2240, top: 890, s: 0.7375, ring: 2, side: 1, wall: [0.255, 0.255, 0.255] },
      { id: "blue", cx: 1075, top: 819, s: 0.863, ring: 1, side: -1, wall: [0.498, 0.576, 0.686] },
      { id: "green", cx: 1909, top: 819, s: 0.863, ring: 1, side: 1, wall: [0.553, 0.588, 0.424] },
      { id: "pink", cx: 1492.5, top: 748, s: 0.9954, ring: 0, side: 0, wall: [0.729, 0.455, 0.675] },
    ] as GeniePhone[],
    /** Flat fallback (no WebGL): image position in prototype frame px. */
    flat: { src: "/images/genie/phones-flat.webp", left: 500, top: 730, width: 1980, w: 1980, h: 1060 },
    /** Locked model look from the prototype studio. */
    model: { thick: 1.3, shade: 0.7, glint: 0.35, glass: 1 },
    /**
     * Spread choreography (fractions of one page change), from the prototype:
     * inner pair starts at 0 and takes 0.74, outer pair starts at 0.22 and takes
     * 0.78. Side phones start at startScale, turned in by tilt degrees, and reach
     * full opacity in the first `fade` of their move. Centre phone stays opaque.
     */
    rings: {
      1: { at: 0, duration: 0.74 },
      2: { at: 0.22, duration: 0.78 },
    } as Record<1 | 2, { at: number; duration: number }>,
    startScale: 0.92,
    tilt: 16,
    fade: 0.16,
    /** Mouse gravity (spring toward the cursor, tanh soft limit). */
    gravity: { tiltMax: 14, stiffness: 110, damping: 11, resist: 1.8 },
  },
  /** "AI design tools" page: app icons with their names (names are part of the images). */
  tools: {
    title: "AI design tools",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud",
    /** vw per design unit of the Figma frames (all icons share one scale). */
    scale: 0.074,
    /** Column width in vw (icons are centred in their column). */
    column: 17,
    /** One row of tool icons. Sizes are the PNG pixels (3x). */
    icons: [
      {
        src: "/images/ai-tools/rive-previewer.png",
        w: 867,
        h: 726,
        alt: "Rive previewer",
        slug: "rive",
      },
      {
        src: "/images/ai-tools/2147228546.png",
        w: 834,
        h: 741,
        alt: "AI Catalogue",
        slug: "ai-cataloging",
      },
      {
        src: "/images/ai-tools/2147228547.png",
        w: 861,
        h: 747,
        alt: "AI content writer",
        slug: "content-writer",
      },
      {
        src: "/images/ai-tools/2147228548.png",
        w: 813,
        h: 768,
        alt: "Lottie creator",
        slug: "lottie",
      },
    ] satisfies ToolIcon[] as ToolIcon[],
    /** "See more" link under the icons (opens in a new tab). */
    seeMore: {
      label: "See all tools",
      href: "https://www.popcorn.design/",
    },
  },

  /** Scroll distance of each page change, in screen heights. Higher = slower. */
  slideLength: 1,
  /** Still time before each change starts (share of the step, 0–1). */
  hold: 0.25,
  /** How far "side" pages slide, in vw. */
  slideDistance: 40,
};

export type GeniePhone = {
  id: string;
  cx: number;
  top: number;
  s: number;
  ring: 0 | 1 | 2;
  side: -1 | 0 | 1;
  wall: [number, number, number];
};
