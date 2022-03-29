// import type { PhasedInstance } from "@starbeam/core";
// import { assert } from "@starbeam/debug";
// import type { AnyKey } from "@starbeam/fundamental";
// import { Reactive } from "@starbeam/reactive";
// import { REACTIVE, ReactiveInternals, UNINITIALIZED } from "@starbeam/timeline";
// import { LOGGER } from "@starbeam/trace-internals";
// import type { Root } from "../root/root.js";
// import {
//   AbstractProgramNode,
//   type RenderedProgramNode,
// } from "./program-node.js";

// /**
//  * This value is a sink for hooks. Importantly, if you finalize this value, its
//  * source will also be finalized.
//  */
// export class HookValue<T = unknown> {
//   static create<T>(): HookValue<T> {
//     return new HookValue<T>(UNINITIALIZED);
//   }

//   /** @internal */
//   static update<T>(slot: HookValue<T>, value: T): void {
//     slot.#value = value;
//   }

//   #value: T | typeof UNINITIALIZED;

//   constructor(value: T | typeof UNINITIALIZED) {
//     this.#value = value;
//   }

//   get current(): T {
//     assert(
//       this.#value !== UNINITIALIZED,
//       `A top-level hook value cannot be observed before the app was rendered`
//     );

//     return this.#value;
//   }
// }

// export type HookContainer = Record<AnyKey, HookValue>;

// export class HookCursor {
//   static create(): HookCursor {
//     return new HookCursor();
//   }
// }

// export class HookProgramNode<T> extends AbstractProgramNode<
//   HookCursor,
//   HookValue
// > {
//   static create<T>(universe: Root, hook: HookBlueprint<T>): HookProgramNode<T> {
//     return new HookProgramNode(universe, SimpleHook.construct(hook, universe));
//   }

//   readonly #universe: Root;
//   readonly #hook: PhasedInstance<unknown>;

//   private constructor(universe: Root, hook: PhasedInstance<T>) {
//     super();
//     this.#universe = universe;
//     this.#hook = hook;
//   }

//   get [REACTIVE](): ReactiveInternals {
//     return this.#hook[REACTIVE];
//   }

//   render(): RenderedProgramNode<HookValue<T>> {
//     return RenderedHook.create(this.#hook);
//   }
// }

// export class RenderedHook<T> implements RenderedProgramNode<HookValue> {
//   static create<T>(hook: PhasedInstance<T>): RenderedHook<T> {
//     return new RenderedHook(hook);
//   }

//   readonly #hook: PhasedInstance<T>;

//   private constructor(hook: PhasedInstance<T>) {
//     this.#hook = hook;
//   }

//   get [REACTIVE](): ReactiveInternals {
//     return this.#hook[REACTIVE];
//   }

//   initialize(_inside: object): void {
//     // TODO: Revisit later once we have streaming with sidecar
//   }

//   poll(inside: HookValue): void {
//     LOGGER.trace.group("\npolling RenderedHook", () => {
//       const hook = this.#hook;
//       const description = Reactive.description(hook);

//       LOGGER.trace.log(`=> polled`, hook[REACTIVE].description);

//       LIFETIME.link(this, hook);

//       LOGGER.trace.group(
//         `hook.current (getting value of instance of ${description})`,
//         () => {
//           HookValue.update(inside, hook.current);
//         }
//       );
//     });
//   }
// }

export {};
