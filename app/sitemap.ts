import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://adams-electric.com";

  // Static pages
  const staticPages = [
    "",
    "/about",
    "/company",
    "/leadership",
    "/contact",
    "/services",
    "/capabilities",
    "/adams-platform",
    "/academy",
    "/academy/courses",
    "/academy/workshops",
    "/resources",
    "/events",
    "/faq",
    "/success-stories",
    "/privacy",
    "/terms",
    "/accessibility",
    "/insights",
    "/schedule-a-call",
    "/interview",
    "/quiz",
    "/quiz-intro",
  ];

  const staticSitemap: MetadataRoute.Sitemap = staticPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/adams-platform" || route === "/services" || route === "/capabilities" ? 0.9 : 0.8,
  }));

  // Service pages with higher priority
  const servicePages = [
    { url: `${baseUrl}/services/preconstruction`, priority: 0.9 },
    { url: `${baseUrl}/services/design-build`, priority: 0.9 },
    { url: `${baseUrl}/services/bim-virtual-design`, priority: 0.9 },
    { url: `${baseUrl}/services/prefabrication`, priority: 0.9 },
    { url: `${baseUrl}/services/construction`, priority: 0.9 },
    { url: `${baseUrl}/services/post-construction`, priority: 0.9 },
  ];

  const serviceSitemap: MetadataRoute.Sitemap = servicePages.map((page) => ({
    url: page.url,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: page.priority,
  }));

  // Insights article pages
  const insightsArticles = [
    { slug: "jobsite-safety-warning-signs", priority: 0.8 },
    { slug: "workforce-development-checklist", priority: 0.8 },
    { slug: "building-field-leadership-team", priority: 0.8 },
    { slug: "project-closeout-best-practices", priority: 0.8 },
    { slug: "preconstruction-planning-blueprint", priority: 0.8 },
    { slug: "why-preconstruction-planning-pays-off", priority: 0.8 },
    { slug: "foreman-to-leader-mindset-shift", priority: 0.8 },
    { slug: "building-projects-that-last", priority: 0.8 },
    { slug: "hidden-cost-of-rework", priority: 0.8 },
  ];

  const insightsSitemap: MetadataRoute.Sitemap = insightsArticles.map((article) => ({
    url: `${baseUrl}/insights/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: article.priority,
  }));

  return [...staticSitemap, ...serviceSitemap, ...insightsSitemap];
}
