import { readonly } from "@starbeam/core-utils";
import type {
  FormulaTag as IFormulaTag,
  ReactiveFormula,
  Stack,
  Tag,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { FormulaTag } from "@starbeam/tags";
import type { Marker } from "./marker.js";
import type { Description } from "@starbeam/debug";

class FormulaValue<T> implements ReactiveFormula<T> {
  declare readonly [TAG]: Tag;
  readonly #initialized: Marker;

  constructor(description: Description) {
    this.#initialized = Marker(description.);
    readonly(this, TAG, FormulaTag.create());
  }

  read: (stack?: Stack | undefined) => IFormulaTag;
}
