import type { CallStack, CoreCellTag, Tagged } from "@starbeam/interfaces";
import { TAG } from "@starbeam/shared";
import { createCellTag } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";
import { type SugaryPrimitiveOptions, toOptions } from "./utils.js";

export interface Marker extends Tagged<CoreCellTag> {
  read: (caller?: CallStack) => void;
  mark: (caller?: CallStack) => void;
  freeze: () => void;
}

export function Marker(options?: SugaryPrimitiveOptions): Marker {
  const { description } = toOptions(options);
  const desc = RUNTIME.Desc?.("cell", description);
  const tag = createCellTag(desc);

  const mark = (caller = RUNTIME.callerStack?.()) => {
    tag.update({ caller, runtime: RUNTIME });
  };

  const read = (_caller = RUNTIME.callerStack?.()): void => {
    RUNTIME.autotracking.consume(tag);
  };

  const freeze = tag.freeze;

  return { [TAG]: tag, read, mark, freeze };
}
