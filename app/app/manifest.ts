import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OneClyq",
    short_name: "OneClyq",
    description: "Create, watch, and connect through short videos on OneClyq.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#440d9c",
    icons: [
      {
        src: "/oneclyq.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/oneclyq.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
