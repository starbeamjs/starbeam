import { Reactive, ReactiveMetadata } from "./core";
import { REACTIVE_BRAND } from "./internal";

export class Static<T> implements Reactive<T> {
  constructor(readonly current: T) {
    REACTIVE_BRAND.brand(this);
  }

  readonly metadata: ReactiveMetadata = { isStatic: true };
}
