import { readonly } from "@starbeam/core-utils";
import type { CallStack, Tag } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";

import { RUNTIME } from "../runtime.js";

export abstract class ReactivePrimitive<V, T extends Tag> {
  declare readonly [TAG]: T;

  constructor(tag: T) {
    readonly(this, TAG, tag);
  }

  abstract read(caller?: CallStack): V;

  get current(): V {
    return this.read(RUNTIME.callerStack?.());
  }
}
