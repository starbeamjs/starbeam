import { descriptionFrom } from "@starbeam/debug";
import type { Reactive } from "@starbeam/interfaces";
import { REACTIVE } from "@starbeam/shared";

export function Static<T>(value: T): Reactive<T> {
  return {
    [REACTIVE]: {
      type: "static",
      description: descriptionFrom({
        type: "static",
        api: {
          name: "Static",
          package: "@starbeam/core",
        },
      }),
    },
    read() {
      return value;
    },
    get current(): T {
      return value;
    },
  };
}
