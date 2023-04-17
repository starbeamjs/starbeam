import type { CallStack, CellTag, Tagged } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createCellTag } from "@starbeam/tags";

import { DEBUG, RUNTIME } from "../runtime.js";
import { type SugaryPrimitiveOptions, toOptions } from "./utils.js";

export interface Marker extends Tagged<CellTag> {
  read: (caller?: CallStack) => void;
  mark: (caller?: CallStack) => void;
  freeze: () => void;
}

export function Marker(options?: SugaryPrimitiveOptions): Marker {
  const { description } = toOptions(options);
  const desc = DEBUG.Desc?.("cell", description);
  const { tag, mark, freeze } = createCellTag(desc);

  return {
    [TAG]: tag,
    read: (_caller = DEBUG.callerStack?.()) => void RUNTIME.consume(tag),
    mark: (_caller = DEBUG.callerStack?.()) => void RUNTIME.mark(tag, mark),
    freeze,
  };
}
