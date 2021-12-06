import { Reactive, ReactiveMetadata } from "./core";

export class Static<T> implements Reactive<T> {
  constructor(readonly current: T) {}

  readonly metadata: ReactiveMetadata = { isStatic: true };
}
