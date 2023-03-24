import {
  callerStack,
  Desc,
  type Description,
  descriptionFrom,
} from "@starbeam/debug";
import type { Stack } from "@starbeam/interfaces";
import type { UNINITIALIZED } from "@starbeam/shared";
import { DelegateTag, getTag } from "@starbeam/tags";
import { diff, Frame, TAG, TIMELINE } from "@starbeam/timeline";

import type { Formula } from "./formula.js";

/**
 * A {@linkcode PolledFormula} is like a {@linkcode Formula}, but it never attempts to avoid running the
 * formula function when the formula is still valid.
 *
 * Its purpose is to provide notifications if any reactive dependency is invalidated, but not get in
 * the way of other kinds of polling-style reactive notifications coming from a framework.
 *
 * In other words, it is a way to create a reactive formula in an environment that will be
 * invalidated by framework polling (and a framework-specific dependency tracking mechanism), but
 * wants to mix in Starbeam's notification mechanism for Starbeam dependencies.
 */

export function PolledFormulaValidation<T>(
  callback: () => T,
  description?: Description | string
): {
  frame: Frame<T | UNINITIALIZED>;
  poll: () => Frame<T>;
  update: (caller?: Stack) => void;
} {
  const desc = descriptionFrom({
    type: "formula",
    api: {
      package: "@starbeam/universal",
      name: "Formula",
    },
    fromUser: description,
  });

  const frame = Frame.uninitialized<T | UNINITIALIZED>(TIMELINE.now, desc);

  const update = (caller: Stack = callerStack()): void => {
    if (import.meta.env.DEV) {
      const oldDeps = new Set(getTag(frame).dependencies());

      frame.evaluate(callback, TIMELINE.frame);
      TIMELINE.update(frame);

      const newDeps = new Set(getTag(frame).dependencies());

      TIMELINE.didConsumeFrame(frame, diff(oldDeps, newDeps), caller);
    } else {
      frame.evaluate(callback, TIMELINE.frame);
      TIMELINE.update(frame);
      TIMELINE.didConsumeFrame(frame, diff.empty(), caller);
    }
  };

  function poll(caller = callerStack()): Frame<T> {
    update(caller);

    return frame as Frame<T>;
  }

  return { poll, update, frame };
}

export function PolledFormula<T>(
  callback: () => T,
  description?: Description | string
): Formula<T> {
  const desc = Desc("formula", description).forApi({
    package: "@starbeam/universal",
    name: "PolledFormula",
  });
  const formula = PolledFormulaValidation(callback, desc);

  const fn = (): T => Frame.value(formula.poll());

  Object.defineProperty(fn, "read", {
    enumerable: false,
    configurable: true,
    writable: true,
    value: fn,
  });

  Object.defineProperty(fn, "current", {
    enumerable: false,
    configurable: true,
    get: fn,
  });

  Object.defineProperty(fn, TAG, {
    enumerable: false,
    configurable: true,
    writable: true,
    value: DelegateTag.create(desc, [formula.frame]),
  });

  return fn as Formula<T>;
}
