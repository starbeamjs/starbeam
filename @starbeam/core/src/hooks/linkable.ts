import { LIFETIME, type IntoFinalizer } from "@starbeam/lifetime";

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

export interface Linkable {
  readonly on: LinkableLifecycle;
  use(linkable: Linkable): void;
}
