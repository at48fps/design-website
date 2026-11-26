import { JetBrains_Mono, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";

/**
 * Fonts of the film archive prototype (self-hosted by next/font). Used for the
 * text drawn into the frames (magazine cover, journal spread, social wall) and
 * for the frame lightbox.
 */
export const filmSerif = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const filmSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const filmMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});
