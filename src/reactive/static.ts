import { ExtendsReactive } from "./base.js";
import { HasMetadata, ReactiveMetadata } from "../core/metadata.js";
import { REACTIVE_BRAND } from "./internal.js";
import { describeValue } from "../describe.js";

export class Static<T> extends ExtendsReactive<T> {
  constructor(
    readonly current: T,
    readonly description = `a static ${describeValue(current)}`
  ) {
    super();
    REACTIVE_BRAND.brand(this);
  }

  readonly metadata = ReactiveMetadata.Constant;
}
