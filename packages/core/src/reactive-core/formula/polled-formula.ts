import {
  type Description,
  callerStack,
  descriptionFrom,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-imports
  ifDebug,
} from "@starbeam/debug";
import type { UNINITIALIZED } from "@starbeam/peer";
import { type Reactive, Frame, REACTIVE, TIMELINE } from "@starbeam/timeline";

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

export function PolledFormula<T>(
  callback: () => T,
  description?: Description | string
): {
  frame: Frame<T | UNINITIALIZED>;
  poll: () => Frame<T>;
  update: (callback: () => T) => void;
} {
  const desc = descriptionFrom({
    type: "formula",
    api: {
      package: "@starbeam/core",
      name: "Formula",
    },
    fromUser: description,
  });

  const frame = Frame.uninitialized<T | UNINITIALIZED>(TIMELINE.now, desc);

  const update = () => {
    TIMELINE.frame.update({
      updating: frame,
      evaluate: callback,
    });
    TIMELINE.update(frame);
  };

  function poll(caller = callerStack()): Frame<T> {
    if (frame) {
      update();
    } else {
      TIMELINE.frame.update({
        updating: frame,
        evaluate: callback,
      });
      TIMELINE.update(frame);
    }

    TIMELINE.frame.didConsume(frame, caller);
    return frame as Frame<T>;
  }

  return { poll, update, frame };
}

interface FormulaFn<T> extends Reactive<T> {
  (): T;
  readonly current: T;
}

export function PolledFormulaFn<T>(
  callback: () => T,
  description?: Description | string
): FormulaFn<T> {
  const formula = PolledFormula(
    callback,
    descriptionFrom({
      type: "formula",
      api: {
        package: "@starbeam/core",
        name: "FormulaFn",
      },
      fromUser: description,
    })
  );

  const fn = () => Frame.value(formula.poll());

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

  Object.defineProperty(fn, REACTIVE, {
    enumerable: false,
    configurable: true,
    writable: true,
    value: {
      type: "delegate",
      description,
      delegate: [formula.frame],
    },
  });

  return fn as FormulaFn<T>;
}
