import { Description, descriptionFrom, idFrom } from "@starbeam/debug";
import type { ReactiveProtocol } from "@starbeam/interfaces";
import type * as interfaces from "@starbeam/interfaces";
import { getID } from "@starbeam/peer";

export class DelegateInternalsImpl implements interfaces.DelegateInternals {
  readonly type = "delegate";

  constructor(
    readonly id: interfaces.ReactiveId,
    readonly delegate: readonly ReactiveProtocol[],
    readonly description: Description
  ) {}
}

export function DelegateInternals(
  to: ReactiveProtocol[],
  options?: { description: string | Description }
): interfaces.DelegateInternals {
  const id = getID();

  const desc = descriptionFrom({
    type: "delegate",
    id,
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
