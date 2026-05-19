import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://starbeamjs.com",
  devToolbar: {
    enabled: false,
  },
  integrations: [
    starlight({
      title: "Starbeam",
      description: "Starbeam is reactivity that stays JavaScript.",
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
          items: [
            { label: "Overview", link: "/concepts/overview/" },
            { label: "Resources and lifecycle", link: "/concepts/lifecycle/" },
          ],
        },
        {
          label: "Framework guides",
          items: [
            { label: "Overview", link: "/frameworks/overview/" },
            { label: "React", link: "/frameworks/react/" },
            { label: "Preact", link: "/frameworks/preact/" },
            { label: "Vue", link: "/frameworks/vue/" },
            { label: "Svelte", link: "/frameworks/svelte/" },
          ],
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
