import { callerStack, Desc, type Description } from "@starbeam/debug";
import type { Stack, Tagged } from "@starbeam/interfaces";
import type * as interfaces from "@starbeam/interfaces";
import { TAG, TIMELINE } from "@starbeam/runtime";
import { CellTag } from "@starbeam/tags";

import { RUNTIME } from "../runtime.js";

export class ReactiveMarker implements Tagged<interfaces.CellTag> {
  static create(tag: CellTag): ReactiveMarker {
    return new ReactiveMarker(tag);
  }

  readonly [TAG]: CellTag;

  private constructor(tag: CellTag) {
    this[TAG] = tag;

    if (import.meta.env.DEV) {
      Object.defineProperty(this, TAG, {
        writable: false,
      });
    }
  }

  freeze(): void {
    this[TAG].freeze();
  }

  consume(caller = callerStack()): void {
    TIMELINE.didConsumeCell(this, caller);
  }

  update(caller: Stack): void {
    this[TAG].update({ runtime: RUNTIME, stack: caller });
  }
}

export function Marker(description?: string | Description): ReactiveMarker {
  return ReactiveMarker.create(
    CellTag.create(
      Desc("cell", description).forApi({
        package: "@starbeam/universal",
        name: "Marker",
      })
    )
  );
}

export type Marker = ReactiveMarker;
