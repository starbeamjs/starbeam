import { TIMELINE } from "../timeline/timeline.js";
import { DebugObjectLifetime, DebugFinalizer } from "./debug.js";

export class Lifetime {
  static scoped(): Lifetime {
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

  readonly finalize = (object: object): void => {
    const lifetime = this.#lifetimes.get(object);

    if (lifetime) {
      // TODO: Make this strippable
      TIMELINE.withAssertFrame(
        () => lifetime.finalize(),
        `while destroying an object`
      );
    }
  };

  readonly link = (parent: object, child: object): void => {
    this.#lifetime(parent).link(this.#lifetime(child));
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

export const LIFETIME = Lifetime.scoped();

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
