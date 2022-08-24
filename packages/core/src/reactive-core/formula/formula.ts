import {
  type Description,
  callerStack,
  descriptionFrom,
} from "@starbeam/debug";
import type { UNINITIALIZED } from "@starbeam/peer";
import { type Reactive, Frame, REACTIVE, TIMELINE } from "@starbeam/timeline";

export interface Formula<T> {
  frame: Frame<T | UNINITIALIZED>;
  poll(): Frame<T>;
}

export function Formula<T>(
  callback: () => T,
  description?: Description | string
): Formula<T> {
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
      const validation = frame.validate();

      if (validation.status !== "valid") {
        update();
      }
    } else {
      TIMELINE.frame.update({
        updating: frame,
        evaluate: callback,
      });
      TIMELINE.update(frame);
    }

    TIMELINE.didConsume(frame, caller);
    return frame as Frame<T>;
  }

  return { poll, frame };
}

export interface FormulaFn<T> extends Reactive<T> {
  (): T;
  readonly current: T;
}

export function FormulaFn<T>(
  callback: () => T,
  description?: Description | string
): FormulaFn<T> {
  const desc = descriptionFrom({
    type: "formula",
    api: {
      package: "@starbeam/core",
      name: "FormulaFn",
    },
    fromUser: description,
  });

  const formula = Formula(callback, desc);

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
      description: desc,
      delegate: [formula.frame],
    },
  });

  return fn as FormulaFn<T>;
}
