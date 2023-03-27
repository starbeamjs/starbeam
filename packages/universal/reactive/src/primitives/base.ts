import { readonly } from "@starbeam/core-utils";
import type { Stack, Tag } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";

import { getRuntime } from "../runtime.js";

export abstract class ReactivePrimitive<V, T extends Tag> {
  declare readonly [TAG]: T;

  constructor(tag: T) {
    readonly(this, TAG, tag);
  }

  abstract read(caller: Stack): V;

  get current(): V {
    return this.read(getRuntime().callerStack());
  }
}
