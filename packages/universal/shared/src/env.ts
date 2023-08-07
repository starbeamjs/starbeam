import { COORDINATION } from "./constants.js";
import type { Unregister } from "./types.js";

export interface Clock {
  timestamp: number;
}

export interface Now {
  timestamp: number;
}

export interface Id {
  readonly get: () => string | number;
}

export interface Stack {
  start: () => () => Set<object>;
  consume: (tag: object) => void;
}

export type FinalizationScope = object;

export interface Lifetime {
  /**
   * Push a finalization scope to the stack. When the block completes, the
   * finalization scope is popped from the stack and added to the original
   * parent scope.
   */
  pushFinalizationScope: (
    child?: object | undefined,
  ) => () => FinalizationScope;

  /**
   * Like {@linkcode pushFinalizationScope}, but does not add the scope to the
   * parent scope when complete. This is useful for scopes that represent
   * long-lived stacks, such as async functions or reactive resources (which can
   * have nested scopes that evolve over time).
   */
  mountFinalizationScope: (child?: object) => () => FinalizationScope;

  linkToFinalizationScope: (
    child: object,
    parent?: FinalizationScope,
  ) => Unregister;
  /**
   * Specify a finalizer that will be called when the object is finalized.
   *
   * `onFinalize` returns a function that, when called, removes the handler
   * (i.e. when the object is finalized, the finalizer will no longer be
   * called).
   */
  onFinalize: ((handler: () => void) => Unregister) &
    ((object: object, handler: () => void) => Unregister);
  /**
   * `finalize` returns true if the object was finalized, and false if the
   * object was already finalized.
   */
  finalize: (lifetime: object) => boolean;
  isFinalized: (lifetime: object) => boolean;
}

export interface Testing {
  registry?: FinalizationRegistryConstructor;
}

export interface StarbeamCoordination {
  now: Now;
  id: Id;
  stack: Stack;
  lifetime: Lifetime;
  testing?: Testing;
}

export interface GlobalWithStarbeam {
  [COORDINATION]: StarbeamCoordination;
}

export function getCoordination(): Partial<StarbeamCoordination> {
  let coordination = (globalThis as unknown as Partial<GlobalWithStarbeam>)[
    COORDINATION
  ];

  if (!coordination) {
    (globalThis as unknown as GlobalWithStarbeam)[COORDINATION] = coordination =
      {} as GlobalWithStarbeam[typeof COORDINATION];
  }

  return coordination;
}
