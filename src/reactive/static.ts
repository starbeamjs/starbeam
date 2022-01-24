import type { Reactive } from "./core";
import { HasMetadata, ReactiveMetadata } from "./metadata";
import { REACTIVE_BRAND } from "./internal";

export class Static<T> extends HasMetadata implements Reactive<T> {
  constructor(readonly current: T) {
    super();
    REACTIVE_BRAND.brand(this);
  }

  readonly metadata = ReactiveMetadata.Constant;
}
