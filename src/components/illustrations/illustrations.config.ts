/**
 * ─────────────────────────────────────────────────────────────
 *  "Asset illustrations" SECTION — TUNING
 *  Icons are 4x PNG renders (724px) of the Figma SVGs in /public/illustration-icons.
 *  File names are the Figma frame numbers.
 * ─────────────────────────────────────────────────────────────
 */

const icon = (id: string) => `/images/illustrations/${id}.png`;

export const illustrationsConfig = {
  title: "Asset illustrations",
  body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud",

  /** Grid cell size in vw. */
  cellSize: 11.8,
  /** PNG size. */
  image: 724,
  /** Seconds for the grid to slide one full set. Higher = slower. 0 = static. */
  duration: 70,

  /** 3 rows; first 8 columns follow the design, the rest continue the loop. */
  rows: [
    [
      "2147227092",
      "2147227093",
      "2147227094",
      "2147227095",
      "2147227096",
      "2147227097",
      "2147227098",
      "2147227099",
      "2147227090",
      "2147227091",
      "2147227100",
      "2147227101",
      "2147227102",
      "2147227103",
    ],
    [
      "2147227098-1",
      "2147227099-1",
      "2147227100-1",
      "2147227101-1",
      "2147227096-2",
      "2147227097-2",
      "2147227098-2",
      "2147227099-2",
      "2147227090-1",
      "2147227096-1",
      "2147227097-1",
      "2147227100-2",
      "2147227100-3",
      "2147227101-2",
    ],
    [
      "2147227092-1",
      "2147227093-1",
      "2147227094-1",
      "2147227095-1",
      "2147227096-3",
      "2147227097-3",
      "2147227098-3",
      "2147227099-3",
      "2147227101-3",
      "2147227102-1",
      "2147227103-1",
      "2147227104",
      "2147227104-1",
      "2147227105",
    ],
  ].map((row) => row.map(icon)),
};
