import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Wiki墙",
    short_name: "My Wiki墙",
    description: "面向数学与信号与系统的题型分类 Wiki 墙。",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#18213a",
    lang: "zh-CN",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
