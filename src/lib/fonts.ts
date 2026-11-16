import localFont from "next/font/local";

/** Body / UI font. */
export const figtree = localFont({
  src: [
    { path: "../../font/figtree_regular.ttf", weight: "400", style: "normal" },
    { path: "../../font/figtree_medium.ttf", weight: "500", style: "normal" },
    { path: "../../font/figtree_semibold.ttf", weight: "600", style: "normal" },
    { path: "../../font/figtree_bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-figtree",
  display: "swap",
});

/** Display serif italic (tall cut) for big headlines. */
export const awesomeSerif = localFont({
  src: "../../font/awesomeserifitalic_tall.otf",
  weight: "400",
  style: "italic",
  variable: "--font-serif",
  display: "swap",
});

/** Display serif italic, bold tall cut, for section headlines. */
export const awesomeSerifBold = localFont({
  src: "../../font/awesomeserifitalic_boldtall.otf",
  weight: "700",
  style: "italic",
  variable: "--font-serif-bold",
  display: "swap",
});

/** Display serif italic, bold extra-tall cut, for smaller section headlines. */
export const awesomeSerifBoldExtraTall = localFont({
  src: "../../font/awesomeserifitalic_boldexratall.otf",
  weight: "700",
  style: "italic",
  variable: "--font-serif-bold-extratall",
  display: "swap",
});
