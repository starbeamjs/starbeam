import type { LifecycleEvents } from "./delegate.js";

/**
 * Activated React states have an already-instantiated instance.
 */
export type InstantiatedStateName =
  | "Rendered"
  | "Attached"
  | "Ready"
  | "Rendering"
  | "Updating"
  | "Reactivating";

export type AsyncStateName = "Attaching";

export abstract class ReactState<T> {
  static rendering<T>(instance: T): RenderingReactState<T> {
    return RenderingReactState.create(instance);
  }

  static attached<T>(instance: T): AttachedReactState<T> {
    return AttachedReactState.create(instance);
  }

  static deactivated<T>(prev: T | null): DeactivatedReactState<T> {
    return DeactivatedReactState.create(prev);
  }

  abstract readonly type: string;

  flush(): this {
    return this;
  }
}

type ReadyCallbackName = "ready" | "attached";

interface BufferedCallbacks<T> {
  readonly delegate: LifecycleEvents<T, any>;
  readonly callbacks: readonly ReadyCallbackName[];
}

export abstract class InstantiatedReactState<T> extends ReactState<T> {
  static is<T>(
    state: ReactState<T> | InstantiatedReactState<T>
  ): state is InstantiatedReactState<T> {
    return state instanceof InstantiatedReactState;
  }

  abstract readonly type: InstantiatedStateName;

  protected constructor(readonly value: T) {
    super();
  }

  ready(callbacks?: BufferedCallbacks<T>): ReadyReactState<T> {
    return ReadyReactState.create(this.value, callbacks);
  }

  updating(): UpdatingReactState<T> {
    return UpdatingReactState.create(this.value);
  }
}

export class UpdatingReactState<T> extends InstantiatedReactState<T> {
  static is<T>(
    state: ReactState<T> | UpdatingReactState<T>
  ): state is UpdatingReactState<T> {
    return state instanceof UpdatingReactState;
  }

  static create<T>(instance: T): UpdatingReactState<T> {
    return new UpdatingReactState(instance);
  }

  readonly type = "Updating";

  attached(): AttachedReactState<T> {
    return AttachedReactState.create(this.value);
  }
}

export class RenderingReactState<T> extends InstantiatedReactState<T> {
  static is<T>(
    state: ReactState<T> | UpdatingReactState<T>
  ): state is UpdatingReactState<T> {
    return state instanceof UpdatingReactState;
  }

  static create<T>(value: T): RenderingReactState<T> {
    return new RenderingReactState(value);
  }

  readonly type = "Rendering";

  rendered(): RenderedReactState<T> {
    return RenderedReactState.create(this.value);
  }
}

export type TopLevelReactState<T> =
  | RenderingReactState<T>
  | UpdatingReactState<T>
  | ReactivatingReactState<T>;

export class ReadyReactState<T> extends InstantiatedReactState<T> {
  static readonly kind = "Ready";

  static is<T>(
    state: ReactState<T> | ReadyReactState<T>
  ): state is ReadyReactState<T> {
    return state instanceof ReadyReactState;
  }

  static create<T>(
    instance: T,
    callbacks?: BufferedCallbacks<T>
  ): ReadyReactState<T> {
    return new ReadyReactState(instance, callbacks ?? null);
  }

  readonly type = "Ready";

  #callbacks: BufferedCallbacks<T> | null;

  private constructor(value: T, callbacks: BufferedCallbacks<T> | null) {
    super(value);
    this.#callbacks = callbacks;
  }

  flush(): this {
    const buffered = this.#callbacks;
    this.#callbacks = null;

    if (buffered) {
      const { delegate, callbacks } = buffered;

      for (const callback of callbacks) {
        delegate[callback]?.(this.value);
      }
    }

    return this;
  }

  attached(): InstantiatedReactState<T> {
    return AttachedReactState.create(this.value);
  }
}

export class RenderedReactState<T> extends InstantiatedReactState<T> {
  readonly kind = "Rendered";

  static is<T>(
    state: ReactState<T> | RenderedReactState<T>
  ): state is RenderedReactState<T> {
    return state instanceof RenderedReactState;
  }

  static create<T>(instance: T): RenderedReactState<T> {
    return new RenderedReactState(instance);
  }

  readonly type = "Rendered";

  attached(): InstantiatedReactState<T> {
    return AttachedReactState.create(this.value);
  }
}

export class AttachedReactState<T> extends InstantiatedReactState<T> {
  readonly kind = "Attached";

  static is<T>(state: ReactState<T>): state is AttachedReactState<T> {
    return state instanceof AttachedReactState;
  }

  static create<T>(instance: T): AttachedReactState<T> {
    return new AttachedReactState(instance);
  }

  readonly type = "Attached";
}

export class DeactivatedReactState<T> extends ReactState<T> {
  readonly kind = "Deactivated";

  static is<T>(
    state: ReactState<T> | DeactivatedReactState<T>
  ): state is DeactivatedReactState<T> {
    return state instanceof DeactivatedReactState;
  }

  static create<T>(prev: T | null): DeactivatedReactState<T> {
    return new DeactivatedReactState(prev);
  }

  readonly type = "Deactivated";
  readonly #prev: T | null;

  private constructor(prev: T | null) {
    super();
    this.#prev = prev;
  }

  ready(): ReadyToReactivateReactState<T> {
    return ReadyToReactivateReactState.create(this.#prev);
  }
}

export class ReadyToReactivateReactState<T> extends ReactState<T> {
  readonly kind = "ReadyToReactivate";

  static is<T>(state: ReactState<T>): state is ReadyToReactivateReactState<T> {
    return state instanceof ReadyToReactivateReactState;
  }

  static create<T>(prev: T | null): ReadyToReactivateReactState<T> {
    return new ReadyToReactivateReactState(prev);
  }

  readonly type = "ReadyToReactivate";

  readonly #prev: T | null;

  private constructor(prev: T | null) {
    super();
    this.#prev = prev;
  }

  get prev(): T | null {
    return this.#prev;
  }

  reactivating(instance: T): ReactivatingReactState<T> {
    return ReactivatingReactState.create(instance);
  }
}

export class ReactivatingReactState<T> extends InstantiatedReactState<T> {
  readonly kind = "Reactivating";

  static is<T>(state: ReactState<T>): state is ReactivatingReactState<T> {
    return state instanceof ReactivatingReactState;
  }

  static create<T>(value: T): ReactivatingReactState<T> {
    return new ReactivatingReactState(value);
  }

  readonly type = "Reactivating";

  attached(): InstantiatedReactState<T> {
    return AttachedReactState.create(this.value);
  }
}

export type PreparedForActivationReactState<T> =
  | RenderedReactState<T>
  | DeactivatedReactState<T>;

export type PreparedForReadyReactState<T> =
  | AttachedReactState<T>
  | ReactivatingReactState<T>;

export type RestingReactState<T> =
  | InstantiatedReactState<T>
  | DeactivatedReactState<T>;
