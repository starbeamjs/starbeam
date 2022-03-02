import type { ReactiveInternals } from "./internals.js";

export const REACTIVE = Symbol("REACTIVE");
export type REACTIVE = typeof REACTIVE;

export interface ReactiveProtocol {
  readonly [REACTIVE]: ReactiveInternals;
}
