import { Tree } from "@starbeam/debug";
import { REACTIVE } from "@starbeam/peer";

import type { ReactiveProtocol } from "./reactive.js";

export function debug(
  reactive: ReactiveProtocol,
  {
    implementation = false,
    source = false,
  }: { implementation?: boolean; source?: boolean } = {}
): string {
  const dependencies = [...reactive[REACTIVE].children().dependencies];
  const descriptions = new Set(
    dependencies.map((dependency) => {
      return implementation
        ? dependency.description
        : dependency.description.userFacing;
    })
  );

  const nodes = [...descriptions].map((d) => {
    const description = implementation ? d : d.userFacing;
    return description.describe({ source });
  });

  return Tree(...nodes).format();
}
