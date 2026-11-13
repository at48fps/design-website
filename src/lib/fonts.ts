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
