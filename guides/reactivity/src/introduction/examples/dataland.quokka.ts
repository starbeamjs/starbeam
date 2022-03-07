import { lifetime, reactive, subscribe } from "@starbeam/core";
import { Cell } from "@starbeam/reactive";

const REPOS = {
  react: "https://github.com/facebook/react",
  ember: "https://github.com/emberjs/ember.js",
  vue: "https://github.com/vuejs/core",
  svelte: "https://github.com/sveltejs/svelte",
} as const;

type Framework = keyof typeof REPOS;

const framework: Cell<Framework> = Cell("vue");

// create a "memo"
const repo = reactive(() => REPOS[framework.current]);

const subscription = subscribe(repo, (subscription) => {
  console.log(subscription.poll());
});

framework.set("react");
framework.set("vue");

lifetime.finalize(subscription);

framework.set("svelte");
