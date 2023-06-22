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

export interface Lifetime {
  createFinalizationScope: () => () => object;
  linkToFinalizationScope: (child: object) => Unregister;
  /**
   * Specify a finalizer that will be called when the object is finalized.
   *
   * `onFinalize` returns a function that, when called, removes the handler
   * (i.e. when the object is finalized, the finalizer will no longer be
   * called).
   */
  onFinalize: (object: object, handler: () => void) => Unregister;
  finalize: (lifetime: object) => void;
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
