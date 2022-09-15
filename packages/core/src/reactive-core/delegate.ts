import type { Description } from "@starbeam/debug";
import { descriptionFrom } from "@starbeam/debug";
import type * as interfaces from "@starbeam/interfaces";

export class DelegateInternalsImpl implements interfaces.DelegateInternals {
  readonly type = "delegate";

  constructor(
    readonly id: interfaces.ReactiveId,
    readonly delegate: readonly interfaces.ReactiveProtocol[],
    readonly description: Description
  ) {}
}

export function DelegateInternals(
  to: interfaces.ReactiveProtocol[],
  options?: { description: string | Description }
): interfaces.DelegateInternals {
  const desc = descriptionFrom({
    type: "delegate",
    api: {
      package: "@starbeam/core",
      name: "DelegateInternals",
    },
    fromUser: options?.description,
  });

  return {
    type: "delegate",
    description: desc,
    delegate: to,
  };
}
