import { callerStack, type Description } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import { DelegateTag } from "@starbeam/tags";
import { TAG, TaggedUtils } from "@starbeam/timeline";

export function Wrap<T, U extends interfaces.ReactiveValue>(
  reactive: U,
  value: T,
  desc?: Description | string
): T & U {
  Object.defineProperty(value, TAG, {
    configurable: true,
    writable: true,
    value: DelegateTag.create(delegateDesc(reactive, desc), [reactive]),
  });

  Object.defineProperty(value, "read", {
    configurable: true,
    writable: true,
    enumerable: false,
    value: (caller = callerStack()) => reactive.read(caller),
  });

  Object.defineProperty(value, "current", {
    configurable: true,
    enumerable: false,
    get: (caller = callerStack()) => reactive.read(caller),
  });

  return value as T & U;
}

function delegateDesc(
  to: interfaces.Tagged | interfaces.Tagged[],
  desc?: string | Description
): Description {
  if (Array.isArray(to)) {
    return desc as Description;
  } else if (typeof desc === "string") {
    return TaggedUtils.description(to).detail(desc);
  } else if (desc === undefined) {
    return TaggedUtils.description(to).detail("{delegate}");
  } else {
    return desc;
  }
}
