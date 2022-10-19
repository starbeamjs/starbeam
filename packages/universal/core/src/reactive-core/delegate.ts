import { type Description, callerStack, Desc } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";
import { REACTIVE, ReactiveProtocol } from "@starbeam/timeline";

export class DelegateInternalsImpl implements interfaces.DelegateInternals {
  readonly type = "delegate";

  constructor(
    readonly id: interfaces.ReactiveId,
    readonly delegate: readonly interfaces.ReactiveProtocol[],
    readonly description: Description
  ) {}
}

export function DelegateInternals(
  to: interfaces.ReactiveProtocol[] | interfaces.ReactiveProtocol,
  options?: { description: string | Description }
): interfaces.DelegateInternals {
  const desc = Desc(
    "delegate",
    options?.description ??
      (Array.isArray(to) ? undefined : ReactiveProtocol.description(to))
  );

  return {
    type: "delegate",
    description: desc,
    delegate: Array.isArray(to) ? to : [to],
  };
}

export function Wrap<
  T extends Record<PropertyKey, unknown>,
  U extends interfaces.ReactiveCore<unknown>
>(reactive: U, value: T, desc?: Description | string): T & U {
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
  to: interfaces.ReactiveProtocol | interfaces.ReactiveProtocol[],
  desc?: string | Description
): Description {
  if (Array.isArray(to)) {
    return desc as Description;
  } else if (typeof desc === "string") {
    return ReactiveProtocol.description(to).detail(desc);
  } else if (desc === undefined) {
    return ReactiveProtocol.description(to).detail("{delegate}");
  } else {
    return desc;
  }
}
