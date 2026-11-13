import type { MetadataRoute } from "next";
import { absoluteUrl, pages } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((p) => ({
    url: absoluteUrl(p.path),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
