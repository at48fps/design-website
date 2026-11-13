/**
 * ─────────────────────────────────────────────────────────────
 *  "Component gallery" SECTION — LAYOUT
 *  Positions are in design px on a 1384-wide canvas (measured from the design);
 *  the canvas scales with the screen. PNGs are 3x renders of the Figma SVGs in
 *  /public/component-gallery-icons.
 * ─────────────────────────────────────────────────────────────
 */

export type GalleryItem = {
  id: string;
  alt: string;
  /** PNG pixel size. */
  w: number;
  h: number;
  /** Top-left on the canvas and display width, in design px. */
  x: number;
  y: number;
  width: number;
};

/** Dashed guide line: horizontal (h) or vertical (v), in design px. */
export type GalleryLine = {
  dir: "h" | "v";
  at: number;
  from: number;
  to: number;
};

export const galleryConfig = {
  title: "Component gallery",
  body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud",

  /** Design canvas size (px). */
  canvas: { w: 1384, h: 600 },
  /** Canvas width on screen, in vw. Lower = smaller gallery. */
  canvasWidth: 80,

  items: [
    {
      id: "Accordion",
      alt: "Accordion",
      w: 1191,
      h: 582,
      x: -34,
      y: 17,
      width: 357,
    },
    {
      id: "AccountManagement-Pattern",
      alt: "Account management",
      w: 1254,
      h: 1317,
      x: -47,
      y: 198,
      width: 376,
    },
    {
      id: "ContentCard-shop",
      alt: "EMI content card",
      w: 738,
      h: 492,
      x: 360,
      y: 19,
      width: 221,
    },
    {
      id: "2147227130",
      alt: "Primary and brand buttons",
      w: 855,
      h: 681,
      x: 341,
      y: 158,
      width: 256,
    },
    {
      id: "Group2085663969",
      alt: "Partner app icons",
      w: 624,
      h: 672,
      x: 375,
      y: 378,
      width: 187,
    },
    {
      id: "Keypad",
      alt: "Number keypad",
      w: 1308,
      h: 1122,
      x: 612,
      y: 14,
      width: 392,
    },
    {
      id: "2147227133",
      alt: "Search, filter chips and tabs",
      w: 858,
      h: 711,
      x: 612,
      y: 363,
      width: 257,
    },
    {
      id: "ProfileCardPattern",
      alt: "Profile card",
      w: 558,
      h: 768,
      x: 903,
      y: 345,
      width: 167,
    },
    {
      id: "2147224238",
      alt: "Product card",
      w: 621,
      h: 1050,
      x: 1034,
      y: 14,
      width: 186,
    },
    {
      id: "2147224479",
      alt: "Label buttons",
      w: 249,
      h: 408,
      x: 1250,
      y: 173,
      width: 75,
    },
    {
      id: "2147227167",
      alt: "Progress indicators",
      w: 408,
      h: 210,
      x: 1278,
      y: 40,
      width: 122,
    },
    {
      id: "2147227141",
      alt: "Icon buttons",
      w: 1032,
      h: 279,
      x: 1108,
      y: 348,
      width: 310,
    },
    {
      id: "2147227166",
      alt: "New arrival tag",
      w: 396,
      h: 213,
      x: 1119,
      y: 478,
      width: 119,
    },
    {
      id: "2147227165",
      alt: "Title tag",
      w: 396,
      h: 213,
      x: 1295,
      y: 478,
      width: 119,
    },
  ] satisfies GalleryItem[],

  lines: [
    { dir: "h", at: 0, from: -60, to: 1440 },
    { dir: "h", at: 578, from: -60, to: 1440 },
    { dir: "h", at: 177, from: -60, to: 341 },
    { dir: "h", at: 328, from: 598, to: 1440 },
    { dir: "h", at: 441, from: 1092, to: 1440 },
    { dir: "v", at: 341, from: 0, to: 578 },
    { dir: "v", at: 598, from: 0, to: 578 },
    { dir: "v", at: 1017, from: 0, to: 328 },
    { dir: "v", at: 1236, from: 0, to: 328 },
    { dir: "v", at: 882, from: 328, to: 578 },
    { dir: "v", at: 1092, from: 328, to: 578 },
  ] satisfies GalleryLine[],
};
