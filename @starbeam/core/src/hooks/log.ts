import { Formula, Linkable, StatefulFormula } from "@starbeam/reactive";
import { Stack } from "@starbeam/trace-internals/node_modules/@starbeam/debug-utils";
import { subscribe } from "../glue/sync.js";

export function Log(
  blueprint: () => void,
  description = Stack.describeCaller()
): Linkable<StatefulFormula<void>> {
  const expression = Formula(blueprint, description);

  return StatefulFormula((log) => {
    log.use(
      subscribe(
        expression,
        (sub) => {
          sub.poll();
        },
        description
      )
    );

    return () => undefined as void;
  }, description);
}
