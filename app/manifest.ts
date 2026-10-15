import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Adams Electric | Build Trust Through Performance",
    short_name: "Adams Electric",
    description:
      "Adams Electric is a third-generation, family-owned electrical contractor serving the Southeast since 1928.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#0072BC",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["business", "productivity"],
    lang: "en-US",
    dir: "ltr",
  };
}
