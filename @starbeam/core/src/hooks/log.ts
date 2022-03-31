import { Memo, StatefulFormula } from "@starbeam/reactive";
import { Stack } from "@starbeam/trace-internals/node_modules/@starbeam/debug-utils";
import { subscribe } from "../glue/sync.js";

export function Log(
  blueprint: () => void,
  description = Stack.describeCaller()
): { readonly owner: (owner: object) => void } {
  return {
    owner: (owner: object) => {
      const expression = Memo(blueprint, description);

      const instance = StatefulFormula((builder) => {
        subscribe(
          expression,
          (sub) => {
            console.log("running susbcription");
            sub.poll();
          },
          description
        );

        builder.on.finalize(() => {
          console.log("finalizing", description);
        });

        return () => null;
      }, description).owner(owner);

      // nobody cares about this value, so kick off the subscription
      instance.current;
    },
  };
}
