/**
 * External AI tools shown inside the site at /tool/<slug>.
 * The tool loads in a full-screen iframe, so the address bar keeps our URL.
 * Add an entry here (and set `slug` on its icon in capabilities.config.ts) to add a tool.
 */
export const tools = {
  rive: {
    name: "Rive previewer",
    url: "https://rive-previever-ritik.vercel.app/",
  },
  lottie: {
    name: "Lottie creator",
    url: "https://pop-compressor-ritik.vercel.app/",
  },
  "ai-cataloging": {
    name: "AI Cataloging",
    url: "https://www.popcorn.design/ai-cataloging",
  },
  "content-writer": {
    name: "AI content writer",
    url: "https://copy-writing-tool-ruddy.vercel.app/",
  },
} as const;

export type ToolSlug = keyof typeof tools;

export const isToolSlug = (slug: string): slug is ToolSlug => slug in tools;
