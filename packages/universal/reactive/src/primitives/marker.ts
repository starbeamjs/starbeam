import { readonly } from "@starbeam/core-utils";
import { Desc, type Description } from "@starbeam/debug";
import { type CellTag as ICellTag, type Tagged } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { CellTag } from "@starbeam/tags";

import { getRuntime } from "../runtime.js";
import type { PrimitiveOptions } from "./shared.js";

class MarkerImpl implements Tagged<ICellTag> {
  static create(this: void, { description }: PrimitiveOptions): MarkerImpl {
    return new MarkerImpl(Desc("cell", description));
  }

  declare readonly [TAG]: ICellTag;

  private constructor(description: Description) {
    readonly(this, TAG, CellTag.create(description));
  }

  read(caller = getRuntime().callerStack()): void {
    this[TAG].update({ stack: caller, runtime: getRuntime() });
  }

  freeze(): void {
    this[TAG].freeze();
  }

  bump(caller = getRuntime().callerStack()): void {
    this[TAG].update({ stack: caller, runtime: getRuntime() });
  }
}

export const Marker = MarkerImpl.create;
export type Marker = MarkerImpl;
