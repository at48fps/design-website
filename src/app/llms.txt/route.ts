import { absoluteUrl, pages, site } from "@/lib/site";

// llms.txt spec: https://llmstxt.org — concise Markdown map of the site for LLMs.
export function GET() {
  const body = `# ${site.name}

> ${site.description}

${site.name} is the design team of ${site.product.name} (${site.product.url}), a UPI payments app built by ${site.parentOrg.name} (${site.parentOrg.url}).

## Pages

${pages.map((p) => `- [${p.title}](${absoluteUrl(p.path)}): ${p.description}`).join("\n")}

## Optional

- [Full content for LLMs](${absoluteUrl("/llms-full.txt")}): Complete site content in plain Markdown.
- [Sitemap](${absoluteUrl("/sitemap.xml")})
`;

  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
