import { absoluteUrl, site } from "@/lib/site";

/** Organization + WebSite structured data (schema.org) for search engines and AI. */
export function SiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": absoluteUrl("/#organization"),
        name: site.legalName,
        alternateName: site.name,
        url: site.url,
        logo: absoluteUrl("/opengraph-image"),
        description: site.description,
        parentOrganization: {
          "@type": "Organization",
          name: site.parentOrg.name,
          url: site.parentOrg.url,
        },
        ...(site.socials.length ? { sameAs: site.socials } : {}),
        ...(site.contactEmail ? { email: site.contactEmail } : {}),
      },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        url: site.url,
        name: site.name,
        description: site.shortDescription,
        inLanguage: site.language,
        publisher: { "@id": absoluteUrl("/#organization") },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
