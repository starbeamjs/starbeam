import preact from "@astrojs/preact";
import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import svelte from "@astrojs/svelte";
import vue from "@astrojs/vue";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://starbeamjs.com",
  devToolbar: {
    enabled: false,
  },
  integrations: [
    react({
      include: [
        "src/components/ReactInventoryDemo.tsx",
        "../../demos/table-react/src/**/*.tsx",
      ],
    }),
    preact({
      include: [
        "src/components/PreactInventoryDemo.tsx",
        "../../demos/table-preact/src/**/*.tsx",
      ],
    }),
    svelte(),
    vue(),
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
          items: [
            { label: "Introduction", link: "/start/introduction/" },
            { label: "Install Starbeam", link: "/start/install/" },
          ],
        },
        {
          label: "Core concepts",
          items: [
            { label: "Overview", link: "/concepts/overview/" },
            {
              label: "Collections and objects",
              link: "/concepts/collections/",
            },
            { label: "Resources and lifecycle", link: "/concepts/lifecycle/" },
            { label: "Services", link: "/concepts/services/" },
            {
              label: "Element resources",
              link: "/concepts/element-resources/",
            },
          ],
        },
        {
          label: "Framework guides",
          items: [
            { label: "Overview", link: "/frameworks/overview/" },
            { label: "React", link: "/frameworks/react/" },
            { label: "Preact", link: "/frameworks/preact/" },
            { label: "Ember", link: "/frameworks/ember/" },
            { label: "Vue", link: "/frameworks/vue/" },
            { label: "Svelte", link: "/frameworks/svelte/" },
          ],
        },
        {
          label: "Demos",
          items: [
            { label: "Overview", link: "/demos/" },
            { label: "Inventory table", link: "/demos/inventory-table/" },
          ],
        },
        {
          label: "Library authors",
          items: [{ label: "Overview", link: "/library-authors/overview/" }],
        },
        {
          label: "Reference",
          items: [
            { label: "Overview", link: "/reference/overview/" },
            { label: "Collections", link: "/reference/collections/" },
            { label: "Universal APIs", link: "/reference/universal/" },
            { label: "Resources", link: "/reference/resources/" },
            { label: "Services", link: "/reference/services/" },
            {
              label: "Reactive primitives",
              link: "/reference/reactive-primitives/",
            },
            {
              label: "Framework adapters",
              link: "/reference/framework-adapters/",
            },
            {
              label: "Core compatibility",
              link: "/reference/core-compatibility/",
            },
          ],
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
