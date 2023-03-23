import {
  callerStack,
  type Description,
  descriptionFrom,
} from "@starbeam/debug";
import type { Reactive, Stack } from "@starbeam/interfaces";
import type { UNINITIALIZED } from "@starbeam/shared";
import { SubscriptionTarget } from "@starbeam/timeline";
import { diff, Frame, REACTIVE, TIMELINE } from "@starbeam/timeline";

export interface FormulaValidation<T> {
  frame: Frame<T | UNINITIALIZED>;
  poll: () => Frame<T>;
}

export function FormulaValidation<T>(
  callback: () => T,
  description?: Description | string
): FormulaValidation<T> {
  const desc = descriptionFrom({
    type: "formula",
    api: {
      package: "@starbeam/universal",
      name: "Formula",
    },
    fromUser: description,
  });

  const frame = Frame.uninitialized<T>(TIMELINE.now, desc);

  const update = (caller: Stack): void => {
    if (import.meta.env.DEV) {
      const oldDeps = new Set(SubscriptionTarget.dependencies(frame));

      frame.evaluate(callback, TIMELINE.frame);

      TIMELINE.update(frame);

      const newDeps = new Set(SubscriptionTarget.dependencies(frame));

      TIMELINE.didConsumeFrame(frame, diff(oldDeps, newDeps), caller);
    } else {
      frame.evaluate(callback, TIMELINE.frame);
      TIMELINE.update(frame);
      TIMELINE.didConsumeFrame(frame, diff.empty(), caller);
    }
  };

  function poll(caller = callerStack()): Frame<T> {
    const validation = frame.validate();

    if (validation.status === "valid") {
      TIMELINE.didConsumeFrame(frame, diff.empty(), caller);
      return frame;
    } else {
      update(caller);
    }

    return frame;
  }

  return { poll, frame };
}

export interface Formula<T> extends Reactive<T> {
  (): T;
  readonly current: T;
}

export function Formula<T>(
  callback: () => T,
  description?: Description | string
): Formula<T> {
  const desc = descriptionFrom({
    type: "formula",
    api: {
      package: "@starbeam/universal",
      name: "Formula",
    },
    fromUser: description,
  });

  const formula = FormulaValidation(callback, desc);

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

  Object.defineProperty(fn, REACTIVE, {
    enumerable: false,
    configurable: true,
    writable: true,
    value: {
      type: "delegate",
      description: desc,
      targets: [formula.frame],
    },
  });

  Object.defineProperty(fn, Symbol.for("nodejs.util.inspect.custom"), {
    enumerable: false,
    configurable: true,
    writable: true,
    value: () => {
      return `Formula(${desc.fullName}, id=${JSON.stringify(desc.id)})`;
    },
  });

  return fn as Formula<T>;
}
