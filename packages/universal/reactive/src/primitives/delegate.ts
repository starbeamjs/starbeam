import { defMethod, getter, readonly } from "@starbeam/core-utils";
import type {
  CallStack,
  Description,
  ReactiveValue,
  Tagged,
} from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createDelegateTag, getDescription, getTag } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";

export function Wrap<T, U extends ReactiveValue>(
  reactive: U,
  value: T,
  desc?: Description | string | undefined
): T & U {
  readonly(
    value,
    TAG,
    createDelegateTag(delegateDesc(reactive, desc), getTag(reactive).targets)
  );

  defMethod(
    value,
    "read",
    (caller: CallStack | undefined = RUNTIME.callerStack?.()) =>
      reactive.read(caller)
  );
  getter(value, "current", () => reactive.read(RUNTIME.callerStack?.()));

  return value as T & U;
}

function delegateDesc(
  to: Tagged | Tagged[],
  desc?: string | Description
): Description | undefined {
  if (Array.isArray(to)) {
    return desc as Description;
  } else if (typeof desc === "string") {
    return getDescription(to)?.detail("delegate", desc);
  } else if (desc === undefined) {
    return getDescription(to)?.detail("delegate", "anonymous");
  } else {
    return desc;
  }
}
