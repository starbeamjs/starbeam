import { getter, method, readonly } from "@starbeam/core-utils";
import type { Stack } from "@starbeam/debug";
import { callerStack, type Description } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { DelegateTag, getTag, taggedDescription } from "@starbeam/tags";

export function Wrap<T, U extends interfaces.ReactiveValue>(
  reactive: U,
  value: T,
  desc?: Description | string
): T & U {
  readonly(
    value,
    TAG,
    DelegateTag.create(delegateDesc(reactive, desc), [getTag(reactive)])
  );

  method(value, "read", (caller: Stack = callerStack()) =>
    reactive.read(caller)
  );
  getter(value, "current", () => reactive.read(callerStack()));

  return value as T & U;
}

function delegateDesc(
  to: interfaces.Tagged | interfaces.Tagged[],
  desc?: string | Description
): Description {
  if (Array.isArray(to)) {
    return desc as Description;
  } else if (typeof desc === "string") {
    return taggedDescription(to).detail(desc);
  } else if (desc === undefined) {
    return taggedDescription(to).detail("{delegate}");
  } else {
    return desc;
  }
}
