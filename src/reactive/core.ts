export interface ReactiveMetadata {
  readonly isStatic: boolean;
}

export interface Reactive<T> {
  readonly current: T;
  readonly metadata: ReactiveMetadata;
}

export type StaticReactive<T> = Reactive<T> & {
  metadata: {
    isStatic: true;
  };
};

export type DynamicReactive<T> = Reactive<T> & {
  metadata: {
    isStatic: false;
  };
};

export const Reactive = {
  isStatic<T>(reactive: Reactive<T>): reactive is StaticReactive<T> {
    return reactive.metadata.isStatic;
  },

  isDynamic<T>(reactive: Reactive<T>): reactive is DynamicReactive<T> {
    return !Reactive.isStatic(reactive);
  },
} as const;
