import type { IS_UPDATED_SINCE } from "./constants.js";

export interface IsUpdatedSince {
  [IS_UPDATED_SINCE](timestamp: Timestamp): boolean;
}

export interface Timestamp {
  gt(other: Timestamp): boolean;
  next(): Timestamp;
}

export interface Cell<T = unknown> extends Reactive<T>, IsUpdatedSince {
  readonly current: T;
  update(value: T): void;
}

export interface HasMetadata {
  isConstant(): boolean;
  isDynamic(): boolean;
  readonly metadata: ReactiveMetadata;
  readonly description?: string;
}

export interface ReactiveMetadata {
  readonly kind: "constant" | "dynamic";

  isConstant(this: ReactiveMetadata): this is ConstantMetadata;
  isDynamic(this: ReactiveMetadata): this is DynamicMetadata;
  describe(): string;
}

export interface ConstantMetadata extends ReactiveMetadata {
  readonly kind: "constant";
}

export interface DynamicMetadata extends ReactiveMetadata {
  readonly kind: "dynamic";
}

export interface Reactive<T = unknown> extends HasMetadata {
  readonly current: T;
  readonly description: string;
}
