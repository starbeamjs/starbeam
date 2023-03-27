import { readonly } from "@starbeam/core-utils";
import { Desc, type Description } from "@starbeam/debug";
import {
  type CellTag as ICellTag,
  type Expand,
  type Tagged,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { CellTag } from "@starbeam/tags";

import { getRuntime } from "../runtime.js";
import { type SugaryPrimitiveOptions, toOptions } from "./utils.js";

class MarkerImpl implements Tagged<ICellTag> {
  static create(this: void, options?: SugaryPrimitiveOptions): MarkerImpl {
    const { description } = toOptions(options);
    return new MarkerImpl(Desc("cell", Desc("cell", description)));
  }

  declare readonly [TAG]: ICellTag;

  private constructor(description: Description) {
    readonly(this, TAG, CellTag.create(description));
  }

  read(_caller = getRuntime().callerStack()): void {
    getRuntime().autotracking.consume(this[TAG]);
  }

  freeze(): void {
    this[TAG].freeze();
  }

  mark(caller = getRuntime().callerStack()): void {
    this[TAG].update({ caller, runtime: getRuntime() });
  }
}

export const Marker = MarkerImpl.create;
export type Marker = Expand<MarkerImpl>;
