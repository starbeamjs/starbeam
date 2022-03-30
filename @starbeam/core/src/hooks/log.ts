import { Memo, Static } from "@starbeam/reactive";
import { Stack } from "@starbeam/trace-internals/node_modules/@starbeam/debug-utils";
import { subscribe } from "../glue/sync.js";
import { BasicPhasedBuilder } from "./linkable.js";
import { PhasedInstance, PhasedReactive } from "./phased.js";

export type LogInstance = PhasedInstance<void>;

export function Log(
  blueprint: () => void,
  description = Stack.describeCaller()
): LogInstance {
  const expression = Memo(blueprint, description);

  const instance = PhasedReactive({
    blueprint: (builder) => {
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

      return Static(undefined);
    },
    createBuilder: BasicPhasedBuilder.create,
    description,
  });

  // Since this is a `Log` there's nobody else to listen for the effect, so
  // immediately poll it to kick it off.
  instance.poll();

  return instance;
}
