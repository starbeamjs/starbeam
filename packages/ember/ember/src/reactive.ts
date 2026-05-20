import { registerDestructor } from "@glimmer/destroyable";
import { Formula } from "@starbeam/reactive";
import { RUNTIME } from "@starbeam/runtime";

import { TrackedTag } from "./tracked.js";

export interface StarbeamValue<T> {
  /**
   * Read the current value. Reading inside an autotracking frame (a Glimmer
   * component getter, a tracked `@cached` getter, a template expression, etc.)
   * registers this value as a dependency.
   */
  readonly current: T;

  /**
   * Stop forwarding Starbeam invalidations into the Glimmer tracking system.
   *
   * Called automatically if `parent` was passed and that destroyable is torn
   * down. Safe to call more than once.
   */
  disconnect: () => void;
}

export interface FromStarbeamOptions {
  /**
   * A destroyable parent (a Glimmer component, modifier, helper, owner, etc.)
   * Disconnect happens automatically when this parent is destroyed.
   */
  readonly parent?: object | undefined;
}

/**
 * Bridge a Starbeam compute into Ember's autotracking system.
 *
 * The returned `current` getter is reactive: writes to Starbeam cells inside
 * `compute` invalidate any Glimmer autotracking frame that read `current`.
 *
 * Pass `options.parent` to tie the subscription's lifetime to a destroyable
 * (the usual case from inside a component). Without `parent`, the caller is
 * responsible for calling `disconnect()`.
 */
export function fromStarbeam<T>(
  compute: () => T,
  options: FromStarbeamOptions = {},
): StarbeamValue<T> {
  const formula = Formula(compute);
  const tag = new TrackedTag();

  let unsubscribe: (() => void) | undefined;
  let disconnected = false;

  const subscribe = (): void => {
    if (unsubscribe !== undefined || disconnected) return;
    unsubscribe = RUNTIME.subscribe(formula, () => void tag.dirty());
  };

  const handle: StarbeamValue<T> = {
    get current(): T {
      tag.consume();
      subscribe();
      return formula.current;
    },
    disconnect(): void {
      if (disconnected) return;
      disconnected = true;
      unsubscribe?.();
      unsubscribe = undefined;
    },
  };

  if (options.parent) {
    registerDestructor(options.parent, () => void handle.disconnect());
  }

  return handle;
}
