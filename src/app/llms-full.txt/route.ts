import { absoluteUrl, pages, site } from "@/lib/site";

// Full plain-Markdown dump of site content so LLMs never need to parse HTML/JS.
// Extend this with each page's full copy as pages are built.
export function GET() {
  const body = `# ${site.name}

> ${site.description}

## About

- Team: ${site.legalName}
- Product: ${site.product.name} — ${site.product.url}
- Company: ${site.parentOrg.name} — ${site.parentOrg.url}
- Website: ${site.url}
${site.contactEmail ? `- Contact: ${site.contactEmail}\n` : ""}
## Focus areas

${site.keywords.map((k) => `- ${k}`).join("\n")}

${pages
  .map(
    (p) => `## ${p.title}

URL: ${absoluteUrl(p.path)}

${p.description}
`,
  )
  .join("\n")}`;

  return new Response(body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
