import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  devToolbar: {
    enabled: false,
  },
  integrations: [
    starlight({
      title: "Starbeam",
      description:
        "Starbeam is a joyful reactivity engine for JavaScript applications.",
      customCss: ["./src/styles/starlight.css"],
      social: [
        {
          href: "https://github.com/starbeamjs/starbeam",
          icon: "github",
          label: "GitHub",
        },
      ],
      sidebar: [
        {
          label: "Start",
          items: [{ label: "Introduction", link: "/start/introduction/" }],
        },
        {
          label: "Core concepts",
          items: [{ label: "Overview", link: "/concepts/overview/" }],
        },
        {
          label: "Framework guides",
          items: [{ label: "Overview", link: "/frameworks/overview/" }],
        },
        {
          label: "Library authors",
          items: [{ label: "Overview", link: "/library-authors/overview/" }],
        },
        {
          label: "Reference",
          items: [{ label: "Overview", link: "/reference/overview/" }],
        },
        {
          label: "Advanced / implementor",
          items: [{ label: "Overview", link: "/advanced/overview/" }],
        },
        {
          label: "Experiments",
          items: [{ label: "Overview", link: "/experiments/overview/" }],
        },
        {
          label: "Archive",
          items: [{ label: "Overview", link: "/archive/overview/" }],
        },
      ],
    }),
  ],
});
