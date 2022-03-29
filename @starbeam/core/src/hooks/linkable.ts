import { LIFETIME, type IntoFinalizer } from "@starbeam/lifetime";
import type { Reactive } from "@starbeam/reactive";
import type { PhasedInstance } from "./phased.js";

export interface LinkableLifecycle {
  finalize(finalizer: IntoFinalizer): void;
}

export function LinkableLifecycle(parent: object): LinkableLifecycle {
  return {
    finalize: () => {
      LIFETIME.finalize(parent);
    },
  };
}

export const MANAGER = Symbol("MANAGER");
export type MANAGER = typeof MANAGER;

interface Poll<T> {
  poll(): T;
}

export interface PhasedBuilder {
  readonly on: LinkableLifecycle;
  use<T>(linkable: PhasedInstance<T>): Reactive<T>;
}

export class BasicPhasedBuilder implements PhasedBuilder {
  static create(): BasicPhasedBuilder {
    return new BasicPhasedBuilder();
  }

  readonly on = LinkableLifecycle(this);

  use<T>(linkable: PhasedInstance<T>): Reactive<T> {
    LIFETIME.link(this, linkable);
    return linkable;
  }
}
