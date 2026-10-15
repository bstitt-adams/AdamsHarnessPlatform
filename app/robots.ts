import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://adams-electric.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/portal/",
          "/api/",
          "/_next/",
          "/admin/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/portal/", "/api/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
