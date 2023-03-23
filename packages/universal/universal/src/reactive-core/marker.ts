import { callerStack, Desc, type Description } from "@starbeam/debug";
import type { Stack, Tagged } from "@starbeam/interfaces";
import type * as interfaces from "@starbeam/interfaces";
import { CellTag } from "@starbeam/tags";
import { TAG, TIMELINE } from "@starbeam/timeline";

export class ReactiveMarker implements Tagged<interfaces.CellTag> {
  static create(tag: CellTag): ReactiveMarker {
    return new ReactiveMarker(tag);
  }

  readonly #tag: CellTag;

  private constructor(tag: CellTag) {
    this.#tag = tag;
  }

  get [TAG](): CellTag {
    return this.#tag;
  }

  freeze(): void {
    this.#tag.freeze();
  }

  consume(caller = callerStack()): void {
    TIMELINE.didConsumeCell(this, caller);
  }

  update(caller: Stack): void {
    this.#tag.update({ timeline: TIMELINE, stack: caller });
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
