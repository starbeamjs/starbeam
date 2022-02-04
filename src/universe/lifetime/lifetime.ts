import type { Universe } from "../universe.js";
import { DebugObjectLifetime, DebugFinalizer } from "./debug.js";

export interface UniverseLifetime {
  link(parent: object, child: object): void;
  readonly debug: readonly DebugObjectLifetime[];
}

export class Lifetime implements UniverseLifetime {
  static scoped(): Lifetime {
    return new Lifetime(new WeakMap(), new Set());
  }

  static finalize(
    lifetime: Lifetime,
    universe: Universe,
    object: object
  ): void {
    lifetime.#finalize(universe, object);
  }

  readonly #lifetimes: WeakMap<object, ObjectLifetime>;
  readonly #roots: Set<ObjectLifetime>;

  private constructor(
    tree: WeakMap<object, ObjectLifetime>,
    roots: Set<ObjectLifetime>
  ) {
    this.#lifetimes = tree;
    this.#roots = roots;
  }

  #finalize(universe: Universe, object: object) {
    this.unroot(object);

    const lifetime = this.#lifetimes.get(object);

    if (lifetime) {
      // TODO: Make this strippable
      universe.withAssertFrame(
        () => lifetime.finalize(),
        `while destroying an object`
      );
    }
  }

  #lifetime(object: object): ObjectLifetime {
    let lifetime = this.#lifetimes.get(object);

    if (!lifetime) {
      lifetime = ObjectLifetime.of(object);
      this.#lifetimes.set(object, lifetime);
    }

    return lifetime;
  }

  /**
   * This API largely exists to aid debugging. Nothing bad will happen if you
   * don't root anything, but it will be impossible to enumerate the
   * application's resources.
   */
  readonly root = (object: object): void => {
    let lifetime = this.#lifetime(object);
    this.#roots.add(lifetime);
  };

  /**
   * Roots are automatically unrooted when they are destroyed, which is the main
   * way that rooted objects should be unrooted. If you want to unroot an object
   * sooner (for example, to reduce noise in a debugging session), you can use
   * this API directly to "forget" a root that hasn't yet been finalized.
   */
  readonly unroot = (object: object): void => {
    let lifetime = this.#lifetimes.get(object);

    if (lifetime) {
      this.#roots.delete(lifetime);
    }
  };

  readonly register = (object: object, finalizer: Finalizer): void => {
    this.#lifetime(object).add(finalizer);
  };

  readonly link = (parent: object, child: object): void => {
    this.#lifetime(parent).link(this.#lifetime(child));
  };

  get debug(): readonly DebugObjectLifetime[] {
    return [...this.#roots].flatMap((lifetime) => {
      if (lifetime.isEmpty) {
        return [];
      } else {
        return [lifetime.debug()];
      }
    });
  }
}

export class ObjectLifetime {
  static of(object: object): ObjectLifetime {
    return new ObjectLifetime(object, new Set(), new Set());
  }

  readonly #object: object;
  readonly #finalizers: Set<Finalizer>;
  readonly #children: Set<ObjectLifetime>;

  private constructor(
    object: object,
    finalizers: Set<Finalizer>,
    children: Set<ObjectLifetime>
  ) {
    this.#object = object;
    this.#finalizers = finalizers;
    this.#children = children;
  }

  get isEmpty(): boolean {
    return this.#finalizers.size === 0 && this.#children.size === 0;
  }

  add(finalizer: Finalizer): void {
    this.#finalizers.add(finalizer);
  }

  link(child: ObjectLifetime): void {
    this.#children.add(child);
  }

  finalize(): void {
    for (let child of this.#children) {
      child.finalize();
    }

    for (let finalizer of this.#finalizers) {
      Finalizer.finalize(finalizer);
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
