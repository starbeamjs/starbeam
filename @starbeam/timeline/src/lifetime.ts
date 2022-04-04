import { DebugFinalizer, DebugObjectLifetime } from "@starbeam/debug";
import { isObject } from "@starbeam/fundamental";
import { TIMELINE } from "./timeline/timeline.js";

export class Lifetime {
  static global(): Lifetime {
    return new Lifetime(new WeakMap());
  }

  readonly #lifetimes: WeakMap<object, ObjectLifetime>;

  private constructor(tree: WeakMap<object, ObjectLifetime>) {
    this.#lifetimes = tree;
  }

  readonly on = {
    finalize: (object: object, finalizer: IntoFinalizer): void =>
      this.#lifetime(object).add(Finalizer.from(finalizer)),
  } as const;

  readonly finalize = (value: unknown): void => {
    if (isObject(value)) {
      const lifetime = this.#lifetimes.get(value);

      if (lifetime) {
        // TODO: Make this strippable
        TIMELINE.withAssertFrame(
          () => lifetime.finalize(),
          `while destroying an object`
        );
      }
    }
  };

  readonly link = <T>(parent: object, child: T): T => {
    if (isObject(child)) {
      this.#lifetime(parent).link(this.#lifetime(child));
    }

    return child;
  };

  debug(...roots: object[]): readonly DebugObjectLifetime[] {
    return roots
      .map((o) => this.#lifetime(o))
      .flatMap((lifetime) => {
        if (lifetime.isEmpty) {
          return [];
        } else {
          return [lifetime.debug()];
        }
      });
  }

  #lifetime(object: object): ObjectLifetime {
    let lifetime = this.#lifetimes.get(object);

    if (!lifetime) {
      lifetime = ObjectLifetime.of(object);
      this.#lifetimes.set(object, lifetime);
    }

    return lifetime;
  }
}

export const LIFETIME = Lifetime.global();

export class ObjectLifetime {
  static of(object: object): ObjectLifetime {
    return new ObjectLifetime(object, new Set(), new Set(), false);
  }

  readonly #object: object;
  readonly #finalizers: Set<Finalizer>;
  readonly #children: Set<ObjectLifetime>;
  #isFinalizing: boolean;

  private constructor(
    object: object,
    finalizers: Set<Finalizer>,
    children: Set<ObjectLifetime>,
    isFinalizing: boolean
  ) {
    this.#object = object;
    this.#finalizers = finalizers;
    this.#children = children;
    this.#isFinalizing = isFinalizing;
  }

  get isEmpty(): boolean {
    return this.#finalizers.size === 0 && this.#children.size === 0;
  }

  add(finalizer: Finalizer): void {
    this.#finalizers.add(finalizer);
  }

  link(child: ObjectLifetime): void {
    if (child === this) {
      console.error(`Unxpectedly attempted to link an object to itself`, {
        parent: this.#object,
        child: child.#object,
      });
      throw Error(
        `An assumption was wrong: Unexpected attempted to link an object to itself`
      );
    }

    this.#children.add(child);
  }

  finalize(): void {
    if (this.#isFinalizing) {
      throw Error(
        `An assumption was wrong: Attempted to finalize an object that was already finalizing`
      );
    }

    this.#isFinalizing = true;

    try {
      for (let child of this.#children) {
        child.finalize();
      }

      this.#children.clear();

      for (let finalizer of this.#finalizers) {
        Finalizer.finalize(finalizer);
      }

      this.#finalizers.clear();
    } finally {
      this.#isFinalizing = false;
    }
  }

  debug(): DebugObjectLifetime {
    return DebugObjectLifetime.create(
      this.#object,
      new Set([...this.#finalizers].map((finalizer) => finalizer.debug())),
      new Set([...this.#children].map((child) => child.debug()))
    );
  }
}

export class Finalizer {
  static create<T>(
    callback: (token: T) => void,
    description: string,
    token: T
  ): Finalizer;
  static create(callback: () => void, description: string): Finalizer;
  static create(
    callback: (token?: unknown) => void,
    description: string,
    token?: unknown
  ): Finalizer {
    return new Finalizer(
      callback as (token: unknown) => void,
      description,
      token
    );
  }

  static from(finalizer: IntoFinalizer): Finalizer {
    if (typeof finalizer === "function") {
      return Finalizer.create(finalizer, `(anonymous finalizer)`, undefined);
    } else if (Array.isArray(finalizer)) {
      return Finalizer.create(
        finalizer[0],
        `(anonymous finalizer)`,
        finalizer[1]
      );
    } else {
      return finalizer;
    }
  }

  static finalize(finalizer: Finalizer): void {
    finalizer.#callback(finalizer.#token);
  }

  readonly #callback: (token: unknown) => void;
  readonly #description: string;
  readonly #token: unknown;

  private constructor(
    callback: (token: unknown) => void,
    description: string,
    token: unknown
  ) {
    this.#callback = callback;
    this.#description = description;
    this.#token = token;
  }

  debug(): DebugFinalizer {
    return DebugFinalizer.create(
      this.#description,
      JSON.stringify(this.#token)
    );
  }
}

export type OnDestroy = [
  callback: (parameter: unknown) => void,
  token: unknown
];

export type IntoFinalizer = Finalizer | (() => void) | OnDestroy;
