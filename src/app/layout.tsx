import type { Metadata, Viewport } from "next";
import { SiteJsonLd } from "@/components/seo/JsonLd";
import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { site } from "@/lib/site";
import { awesomeSerif, figtree } from "@/lib/fonts";
import "@/styles/globals.scss";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s — ${site.name}` },
  description: site.description,
  applicationName: site.name,
  keywords: [...site.keywords],
  authors: [{ name: site.legalName, url: site.url }],
  creator: site.legalName,
  publisher: site.parentOrg.name,
  alternates: {
    canonical: "/",
    types: { "text/markdown": "/llms.txt" },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title: site.title,
    description: site.description,
    locale: site.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
    ...(site.twitter ? { site: site.twitter, creator: site.twitter } : {}),
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: site.themeColor,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={site.language} className={`${figtree.variable} ${awesomeSerif.variable}`}>
      <body>
        <SiteJsonLd />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
