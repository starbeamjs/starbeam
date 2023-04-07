import { readonly } from "@starbeam/core-utils";
import {
  type CellTag as ICellTag,
  type Description,
  type Expand,
  type Tagged,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createCellTag } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";
import { type SugaryPrimitiveOptions, toOptions } from "./utils.js";

class MarkerImpl implements Tagged<ICellTag> {
  static create(this: void, options?: SugaryPrimitiveOptions): MarkerImpl {
    const { description } = toOptions(options);
    return new MarkerImpl(RUNTIME.Desc?.("cell", description));
  }

  declare readonly [TAG]: ICellTag;

  private constructor(description: Description | undefined) {
    readonly(this, TAG, createCellTag(description));
  }

  read(_caller = RUNTIME.callerStack?.()): void {
    RUNTIME.autotracking.consume(this[TAG]);
  }

  freeze(): void {
    this[TAG].freeze();
  }

  mark(caller = RUNTIME.callerStack?.()): void {
    this[TAG].update({ caller, runtime: RUNTIME });
  }
}

export const Marker = MarkerImpl.create;
export type Marker = Expand<MarkerImpl>;
