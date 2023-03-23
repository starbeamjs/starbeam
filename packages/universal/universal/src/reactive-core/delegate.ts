import { callerStack, Desc, type Description } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import { REACTIVE, SubscriptionTarget } from "@starbeam/timeline";

export class DelegateInternalsImpl implements interfaces.DelegateCore {
  readonly type = "delegate";

  constructor(
    readonly id: interfaces.ReactiveId,
    readonly targets: readonly interfaces.SubscriptionTarget[],
    readonly description: Description
  ) {}
}

export function DelegateInternals(
  to: interfaces.SubscriptionTarget[] | interfaces.SubscriptionTarget,
  options?: { description: string | Description }
): interfaces.DelegateCore {
  const desc = Desc(
    "delegate",
    options?.description ??
      (Array.isArray(to) ? undefined : SubscriptionTarget.description(to))
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
  Object.defineProperty(value, REACTIVE, {
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
  to: interfaces.SubscriptionTarget | interfaces.SubscriptionTarget[],
  desc?: string | Description
): Description {
  if (Array.isArray(to)) {
    return desc as Description;
  } else if (typeof desc === "string") {
    return SubscriptionTarget.description(to).detail(desc);
  } else if (desc === undefined) {
    return SubscriptionTarget.description(to).detail("{delegate}");
  } else {
    return desc;
  }
}
