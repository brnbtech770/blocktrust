import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-metadata";

/** Pages marketing / publiques uniquement — pas les zones connectées. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const paths: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"] }[] =
    [
      { path: "", priority: 1, changeFrequency: "weekly" },
      { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
      { path: "/verify", priority: 0.85, changeFrequency: "monthly" },
      { path: "/how-to", priority: 0.8, changeFrequency: "monthly" },
      { path: "/menaces", priority: 0.75, changeFrequency: "weekly" },
      { path: "/privacy", priority: 0.5, changeFrequency: "yearly" },
      { path: "/cgu", priority: 0.5, changeFrequency: "yearly" },
    ];

  return paths.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
