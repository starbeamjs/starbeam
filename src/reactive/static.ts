import type { AbstractReactive } from "./core";
import { HasMetadata, ReactiveMetadata } from "./metadata";
import { REACTIVE_BRAND } from "./internal";
import { describeValue } from "../describe";

export class Static<T> extends HasMetadata implements AbstractReactive<T> {
  constructor(
    readonly current: T,
    readonly description = `a static ${describeValue(current)}`
  ) {
    super();
    REACTIVE_BRAND.brand(this);
  }

  readonly metadata = ReactiveMetadata.Constant;
}
