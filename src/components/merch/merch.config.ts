/**
 * ─────────────────────────────────────────────────────────────
 *  "Cinematic merch" SECTION — TUNING
 *  Cards are 4x PNG renders of the Figma SVG exports in
 *  /public/images/capabilities (the SVGs are 1–24 MB each, too heavy for the page).
 * ─────────────────────────────────────────────────────────────
 */

export type MerchCard = { src: string; alt: string };

const card = (id: string, alt: string): MerchCard => ({
  src: `/images/capabilities/cards/${id}.png`,
  alt,
});

export const merchConfig = {
  title: "Cinematic merch",
  body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud",

  /** PNG size (includes the drop shadow below the card). */
  image: { w: 1148, h: 1024 },
  /** Card width in vw. */
  cardWidth: 18.8,
  /** Speed while the cursor is over the cards (share of normal speed; 0 = stop). */
  hoverSpeed: 0.3,
  /** Space between cards in vw. */
  gap: 2,

  rows: [
    {
      /** Seconds for one full loop. Higher = slower. */
      duration: 32,
      direction: "left",
      cards: [
        card("C1.1", "Everything UPI"),
        card("C1.2", "Pay friends"),
        card("C1.3", "Transfer money"),
        card("C1.4", "POP your bills"),
        card("C1.5", "POPcoin balance"),
        card("C1.6", "POPchop"),
      ],
    },
    {
      duration: 29,
      direction: "right",
      cards: [
        card("C2.1", "UPI lite"),
        card("C2.2", "Pay with fingerprint"),
        card("C2.3", "Check balance"),
        card("C2.4", "Manage autopay"),
        card("C2.5", "Up to 80% off on POPshop using POPcoins"),
      ],
    },
  ] as { duration: number; direction: "left" | "right"; cards: MerchCard[] }[],
};
