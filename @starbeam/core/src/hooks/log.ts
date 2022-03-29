import { Static } from "@starbeam/reactive";
import { Stack } from "@starbeam/trace-internals/node_modules/@starbeam/debug-utils";
import { BasicPhasedBuilder } from "./linkable.js";
import { PhasedInstance, PhasedReactive } from "./phased.js";

export type LogInstance = PhasedInstance<void>;

export function Log(
  blueprint: () => void,
  description = Stack.describeCaller()
): LogInstance {
  return PhasedReactive({
    blueprint: () => {
      blueprint();
      return Static(undefined);
    },
    createBuilder: BasicPhasedBuilder.create,
    description,
  });
}
