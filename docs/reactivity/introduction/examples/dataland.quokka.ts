import { Cell, reactive } from "@starbeam/core";
import "symbol-observable";
import { display } from "./quokka-shim.js";

{
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

  display(repo); //?

  framework.set("react");
  // framework.set("vue");
  // framework.set("ember");

  // let subscription = subscribe(repo, () => {
  //   currentRepo = repo.current;
  // });

  // subscription.poll(); //?

  // framework.set("vue");

  // currentRepo; //?

  // subscription.poll(); //?

  // lifetime.finalize(subscription);

  // framework.set("ember");

  // currentRepo; //?
}
