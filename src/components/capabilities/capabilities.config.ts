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

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud Lorem ipsum dolor s, quis nostrudLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud Lorem ipsum dolor s, quis nostrud";

export const capabilitiesConfig = {
  /** Tab row labels. */
  tabs: ["Visuals", "Ai", "Design system", "Content"],
  /** How much of the line after "Visuals" is filled at the start (0–1). */
  lineFill: 0.4,

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

  agentic: {
    title: "Agentic commerce",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud",
  },

  /** Agentic commerce phone page; side phones spread out on the next scroll. */
  phones: {
    src: "/images/capabilities/genie-phone.png",
    w: 1204,
    h: 2216,
    alt: "POPgenie shopping assistant on a phone",
    /** Phone image width in vw (includes its shadow). */
    width: 20,
  },
  /** "AI design tools" page: app icons with their names (names are part of the images). */
  tools: {
    title: "AI design tools",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud",
    /** vw per design unit of the Figma frames (all icons share one scale). */
    scale: 0.074,
    /** Column width in vw (icons are centred in their column). */
    column: 17,
    /** Rows of icons; the design repeats the same four. Sizes are the PNG pixels (3x). */
    rows: [0, 1].map(() => [
      {
        src: "/images/ai-tools/rive-previewer.png",
        w: 867,
        h: 726,
        alt: "Rive previewer",
      },
      {
        src: "/images/ai-tools/2147228546.png",
        w: 834,
        h: 741,
        alt: "AI Catalogue",
      },
      {
        src: "/images/ai-tools/2147228547.png",
        w: 861,
        h: 747,
        alt: "AI content writer",
      },
      {
        src: "/images/ai-tools/2147228548.png",
        w: 813,
        h: 768,
        alt: "Lottie creator",
      },
    ]),
  },

  /** How far the side phones end up from the centre phone, in vw. */
  spreadDistance: 18.6,

  /** Scroll distance of each page change, in screen heights. Higher = slower. */
  slideLength: 1,
  /** Still time before each change starts (share of the step, 0–1). */
  hold: 0.25,
  /** How far "side" pages slide, in vw. */
  slideDistance: 40,
};
