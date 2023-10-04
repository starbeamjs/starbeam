import { DisplayNewtype } from "@starbeam/core-utils";
import type { JsonPrimitive } from "@starbeam-workspace/json";

import type { RawJsonPrimitive } from "../raw.js";
import type { SourceRange } from "../source.js";
import { getRange } from "./abstract.js";
import { BaseNode } from "./base.js";

export class JsonPrimitiveNode<
  N extends RawJsonPrimitive = RawJsonPrimitive,
  J extends JsonPrimitive = JsonPrimitive,
> extends BaseNode<N, J> {
  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayNewtype(this.raw.type, this.raw.value, {
      annotation: getRange(this).format(),
    });
  }

  override get marker(): SourceRange {
    return this.range;
  }
}
