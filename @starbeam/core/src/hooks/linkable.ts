import { LIFETIME, type IntoFinalizer } from "@starbeam/timeline";

export interface LinkableLifecycle {
  finalize(finalizer: IntoFinalizer): void;
}

export function LinkableLifecycle(parent: object): LinkableLifecycle {
  return {
    finalize: (callback: IntoFinalizer) => {
      LIFETIME.on.finalize(parent, callback);
    },
  };
}

export interface PhasedBuilder {
  readonly on: LinkableLifecycle;
}

export class BasicPhasedBuilder implements PhasedBuilder {
  static create(): BasicPhasedBuilder {
    return new BasicPhasedBuilder();
  }

  readonly on = LinkableLifecycle(this);
}
