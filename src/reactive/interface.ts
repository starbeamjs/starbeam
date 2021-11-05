export interface ReactiveMetadata {
  readonly isStatic: boolean;
}

export interface Reactive<T> {
  readonly current: T;
  readonly metadata: ReactiveMetadata;
}
