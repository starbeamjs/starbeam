import type { Reactive } from "../reactive/core";

// export abstract class AbstractHook<T> extends AbstractReactive<T> {
//   readonly #universe: Universe;
//   readonly #description: string;
//   readonly exposed: Reactive<Reactive<T>>;

//   protected constructor(universe: Universe, description: string) {
//     super();
//     this.#universe = universe;
//     this.#description = description;
//     this.exposed = this.#universe.memo(() => this.public(), this.#description);
//   }

//   abstract public(): Reactive<T>;
//   abstract poll(): void;

//   get description(): string {
//     return `hook: ${this.#description}`;
//   }

//   get current(): T {
//     let outer = this.exposed.current;
//     return outer.current;
//   }
// }

export type Hook<T = unknown> = Reactive<T>;
