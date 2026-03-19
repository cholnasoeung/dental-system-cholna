import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const routes = [
  "",
  "/login",
  "/register",
  "/patients",
  "/appointments",
  "/emr",
  "/billing",
  "/prescriptions",
  "/notifications",
  "/reports",
  "/staff",
  "/portal",
  "/support-center",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "daily",
    priority: route === "" ? 1 : 0.7,
  }));
}
