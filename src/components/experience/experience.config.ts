/**
 * ─────────────────────────────────────────────────────────────
 *  "Crafting an Experience" SECTION — TUNING
 *  Positions/sizes are in vw (share of screen width), measured from the design.
 * ─────────────────────────────────────────────────────────────
 */

/** All bubbles in the Figma exports share one circle radius (91.4071 in SVG units). */
const SVG_BUBBLE_DIAMETER = 182.8142;

export type Bubble = {
  /** File in /public/images. */
  src: string;
  alt: string;
  /** SVG canvas size. */
  svgW: number;
  svgH: number;
  /** Bubble centre inside the SVG. */
  cx: number;
  cy: number;
  /** Where the bubble centre sits on screen (vw). */
  x: number;
  y: number;
  /** Float animation: travel (px), duration (s), delay (s). */
  float: { range: number; duration: number; delay: number };
};

export const experienceConfig = {
  /** Visible bubble diameter (vw). */
  bubbleSize: 12,
  svgBubbleDiameter: SVG_BUBBLE_DIAMETER,

  bubbles: [
    {
      src: "/images/cards.svg",
      alt: "Stack of payment cards",
      svgW: 298,
      svgH: 298,
      cx: 148.691,
      cy: 148.691,
      x: 24.2,
      y: 6.9,
      float: { range: 14, duration: 5.2, delay: 0 },
    },
    {
      src: "/images/camera.svg", // green safe
      alt: "Green safe",
      svgW: 345,
      svgH: 345,
      cx: 166.944,
      cy: 170.136,
      x: 72.3,
      y: 13.6,
      float: { range: 12, duration: 6.1, delay: -1.8 },
    },
    {
      src: "/images/printer.svg", // instant camera
      alt: "Instant camera",
      svgW: 212,
      svgH: 191,
      cx: 116.47,
      cy: 95.4981,
      x: 12.9,
      y: 28.2,
      float: { range: 16, duration: 5.6, delay: -3.1 },
    },
    {
      src: "/images/torch.svg",
      alt: "Torch",
      svgW: 402,
      svgH: 357,
      cx: 233.145,
      cy: 174.887,
      x: 84.8,
      y: 34.5,
      float: { range: 13, duration: 6.4, delay: -2.4 },
    },
  ] satisfies Bubble[],

  /**
   * Soft contact shadow on the page under each bubble (share of bubble diameter).
   * It stays on the page and shrinks / fades as the bubble floats up.
   */
  shadow: {
    offsetX: 0.14,
    offsetY: 0.52,
    width: 0.72,
    height: 0.2,
    opacity: 0.42,
  },

  /** pop radio (centre column). */
  radio: {
    src: "/images/popradio.png",
    w: 1552,
    h: 1140,
    width: 32.6,
    top: 11.6,
  },

  /** Text block top (vw). */
  textTop: 34.6,

  /** "LIVE" pill above the brand film card (vw). */
  live: { top: 32.7 },

  /**
   * Brand film card shown on the quilt after the tear. On scroll it grows to fill
   * the screen, then zooms out and fades, revealing the "Truly levelled up" screen.
   */
  film: {
    src: "/images/hero/future-retro-noir.webp",
    alt: "Future Retro Noir by pop — watch brand film",
    /** Real pixel size of the file. */
    w: 2940,
    h: 1486,
    /** Card width and top at rest (vw); it is centred horizontally. */
    width: 78,
    top: 44.6,
    /** Corner radius as a share of the card width (from the design: 53.34 / 1470). */
    radius: 0.0363,
    /** Extra pinned scroll for the whole film sequence, in screen heights. Higher = slower. */
    scrollLength: 3.2,
    /** Card width (vw) once it has grown and slid fully into view. */
    grownWidth: 96,
    /** Card width (vw) after zooming back out from full screen, before it fades. */
    exitWidth: 80,
  },
} as const;
