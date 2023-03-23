import { callerStack, Desc, type Description } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import { TAG, Tagged } from "@starbeam/timeline";

export class DelegateInternalsImpl implements interfaces.DelegateTag {
  readonly type = "delegate";

  constructor(
    readonly id: interfaces.ReactiveId,
    readonly targets: readonly interfaces.Tagged[],
    readonly description: Description
  ) {}
}

export function DelegateInternals(
  to: interfaces.Tagged[] | interfaces.Tagged,
  options?: { description: string | Description }
): interfaces.DelegateTag {
  const desc = Desc(
    "delegate",
    options?.description ??
      (Array.isArray(to) ? undefined : Tagged.description(to))
  );

  return {
    type: "delegate",
    description: desc,
    targets: Array.isArray(to) ? to : [to],
  };
}

export function Wrap<T, U extends interfaces.ReactiveValue>(
  reactive: U,
  value: T,
  desc?: Description | string
): T & U {
  Object.defineProperty(value, TAG, {
    configurable: true,
    writable: true,
    value: DelegateInternals(reactive, {
      description: delegateDesc(reactive, desc),
    }),
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
    return Tagged.description(to).detail(desc);
  } else if (desc === undefined) {
    return Tagged.description(to).detail("{delegate}");
  } else {
    return desc;
  }
}
