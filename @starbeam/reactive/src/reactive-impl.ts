export {};
// import { Abstraction, assert } from "@starbeam/debug";
// import { COORDINATOR } from "@starbeam/schedule";
// import {
//   CONSTANT_VALUE,
//   DYNAMIC_LEAF,
//   IS_UPDATED_SINCE,
//   ReactiveDependencies,
//   ReactiveNode,
//   Timestamp,
//   UNINITIALIZED,
//   UNINITIALIZED_REACTIVE,
//   type FrameChild,
//   type LeafSymbol,
//   type ReactiveCore,
//   type ReactiveLeaf,
// } from "@starbeam/timeline";
// import type {
//   DerivedReactivePrimitive,
//   MutableReactivePrimitive,
// } from "./internal-interface.js";

// export interface ReactiveValue<T> extends ReactiveCore {
//   readonly current: T;
// }

// export type ReactiveLeafValue<T> = ReactiveValue<T> & ReactiveLeaf;

// interface InternalState<State> {
//   readonly state: State;
//   readonly dependencies: ReactiveDependencies;
// }

// export class ReactiveChild {
//   static create(child: FrameChild): ReactiveChild {
//     return new ReactiveChild(child);
//   }

//   readonly #child: FrameChild;

//   private constructor(child: FrameChild) {
//     this.#child = child;
//   }

//   get isConstant(): boolean {
//     return ReactiveNode.isConstant(this.#child);
//   }

//   get dependencies(): readonly ReactiveLeaf[] {}
// }

// export class ReactiveChildren {
//   static create(): ReactiveChildren {
//     return new ReactiveChildren([]);
//   }

//   readonly #children: readonly ReactiveChild[];

//   private constructor(children: readonly ReactiveChild[]) {
//     this.#children = children;
//   }

//   get dependencies(): ReactiveDependencies {
//     if (this.#children.every((child) => child.isConstant)) {
//       return CONSTANT_VALUE;
//     }
//   }
// }

// export class DerivedReactive<T, State = unknown> implements ReactiveValue<T> {
//   static create<T>(
//     primitive: DerivedReactivePrimitive<T, unknown>,
//     description = Abstraction.callerFrame()
//   ): DerivedReactive<T> {
//     return new DerivedReactive(
//       primitive,
//       UNINITIALIZED_REACTIVE,
//       UNINITIALIZED,
//       description
//     );
//   }

//   readonly #primitive: DerivedReactivePrimitive<T, State>;
//   #dependencies: ReactiveDependencies;
//   #children: readonly FrameChild[];
//   #state: InternalState<State> | UNINITIALIZED;
//   readonly #description: string;

//   constructor(
//     primitive: DerivedReactivePrimitive<T, State>,
//     dependencies: ReactiveDependencies,
//     children: readonly FrameChild[],
//     state: InternalState<State> | UNINITIALIZED,
//     description: string
//   ) {
//     this.#primitive = primitive;
//     this.#dependencies = dependencies;
//     this.#children = children;
//     this.#state = state;
//     this.#description = description;
//   }

//   [IS_UPDATED_SINCE](timestamp: Timestamp): boolean {
//     const dependencies = ReactiveNode.getDependencies(this);

//     if (
//       ReactiveDependencies.isUninitialized(dependencies) ||
//       ReactiveDependencies.isConstantLeaf(dependencies)
//     ) {
//       return false;
//     }

//     assert(
//       !ReactiveDependencies.isDynamicLeaf(dependencies),
//       `The dependencies of a DerivedReactivePrimitive must not be a dynamic leaf`
//     );

//     // if (ReactiveDependencies.)

//     return this.#children.some((child) => child.isUpdatedSince(timestamp));
//   }

//   get description(): string {
//     return this.#description;
//   }

//   get current(): T {
//     const state = this.#state;

//     if (state === UNINITIALIZED) {
//       const { value, dependencies } = this.#primitive.initialize(
//         this.#description
//       );
//       this.#dependencies = dependencies;
//       return value;
//     } else {
//       const { value, dependencies } = this.#primitive.poll(
//         state.state,
//         this.#description
//       );
//       this.#dependencies = dependencies;
//       return value;
//     }
//   }

//   get dependencies(): ReactiveDependencies {
//     return this.#children.flatMap((child) => child.dependencies);
//   }
// }

// export class ReactiveMarker implements ReactiveLeaf {
//   static create(description: string = Abstraction.callerFrame()) {
//     const bookkeeping = MutableBookkeeping.create(description);
//   }

//   readonly #bookkeeping: MutableBookkeeping;

//   private constructor(bookkeeping: MutableBookkeeping) {
//     this.#bookkeeping = bookkeeping;
//   }

//   get description(): string {
//     return this.#bookkeeping.description;
//   }

//   get dependencies(): LeafSymbol {
//     return this.#bookkeeping.dependencies;
//   }

//   [IS_UPDATED_SINCE](timestamp: Timestamp): boolean {
//     return this.#bookkeeping.isUpdatedSince(timestamp);
//   }

//   update(): void {
//     this.#bookkeeping.update(this);
//   }

//   consume(): void {
//     this.#bookkeeping.consume(this);
//   }
// }

// export class MutableReactive<T> implements ReactiveValue<T>, ReactiveLeaf {
//   static create<T>(
//     primitive: MutableReactivePrimitive<T>,
//     description: string
//   ): MutableReactive<T> {
//     return new MutableReactive(
//       primitive,
//       MutableBookkeeping.create(description)
//     );
//   }

//   readonly #primitive: MutableReactivePrimitive<T>;
//   readonly #bookkeeping: MutableBookkeeping;

//   private constructor(
//     primitive: MutableReactivePrimitive<T>,
//     bookkeeping: MutableBookkeeping
//   ) {
//     this.#primitive = primitive;
//     this.#bookkeeping = bookkeeping;
//   }

//   readonly dependencies: DYNAMIC_LEAF = DYNAMIC_LEAF;

//   [IS_UPDATED_SINCE](timestamp: Timestamp): boolean {
//     return this.#bookkeeping.isUpdatedSince(timestamp);
//   }

//   get description(): string {
//     return this.#bookkeeping.description;
//   }

//   get current(): T {
//     this.#bookkeeping.consume(this);
//     return this.#primitive.get();
//   }

//   update(value: T): void {
//     const tx = COORDINATOR.begin(`updating ${this.description}`);
//     this.#bookkeeping.update(this);
//     this.#primitive.update(value);
//     tx.commit();
//   }
// }
