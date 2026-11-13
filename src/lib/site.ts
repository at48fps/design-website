/**
 * Single source of truth for site-wide content.
 * Used by metadata, OG tags, JSON-LD, sitemap, robots, llms.txt and llms-full.txt.
 * Update this file when pages or copy change — every SEO/AIEO surface follows.
 */

export const site = {
  name: "Pop Design",
  legalName: "Pop UPI Design Team",
  parentOrg: {
    name: "Razorpay",
    url: "https://razorpay.com",
  },
  product: {
    name: "Pop UPI",
    url: "https://popclub.co.in",
  },
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  title: "Pop Design — Design Team behind Pop UPI by Razorpay",
  shortDescription:
    "The design team crafting Pop UPI by Razorpay — product design, brand, motion and design systems.",
  description:
    "Pop Design is the in-house design team of Pop UPI, a UPI payments app by Razorpay. We design the product experience, brand identity, motion language and design system that make paying with Pop simple and delightful.",
  keywords: [
    "Pop UPI",
    "Pop Design",
    "Razorpay design",
    "UPI app design",
    "fintech design",
    "product design",
    "design system",
    "brand design",
    "motion design",
    "UX design India",
  ],
  locale: "en_IN",
  language: "en-IN",
  themeColor: "#000000",
  backgroundColor: "#000000",
  twitter: "", // e.g. "@popclub" — fill in when known
  socials: [] as string[], // full profile URLs (LinkedIn, Instagram, Dribbble, Behance...)
  contactEmail: "", // fill in when known
} as const;

export type SitePage = {
  path: string;
  title: string;
  description: string;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
};

/** Register every public page here. Drives sitemap + llms.txt. */
export const pages: SitePage[] = [
  {
    path: "/",
    title: "Home",
    description: site.shortDescription,
    changeFrequency: "weekly",
    priority: 1,
  },
];

export const absoluteUrl = (p = "/") => new URL(p, site.url).toString();
