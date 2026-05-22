import { consumeTag, createTag, dirtyTag } from "@glimmer/validator";
import type { CellTag, Tag } from "@starbeam/interfaces";
import { addRuntimeHooks } from "@starbeam/runtime";
import { getDependencies } from "@starbeam/tags";

/**
 * Minimal tracked storage built on the lowest-level Glimmer tag primitives.
 *
 * Why not `@tracked` from `@glimmer/tracking`: Stage 1 field decorators only
 * work with `useDefineForClassFields: false`, but the Starbeam workspace ships
 * with `useDefineForClassFields: true`. Tags compile under any settings.
 */
export class TrackedTag {
  readonly #tag = createTag();

  consume(): void {
    consumeTag(this.#tag);
  }

  dirty(): void {
    dirtyTag(this.#tag);
  }
}

const STARBEAM_TAGS = new WeakMap<CellTag, TrackedTag>();
let uninstall: (() => void) | undefined;

export function installStarbeamTags(): void {
  uninstall ??= addRuntimeHooks({
    consume: consumeStarbeamTag,
    mark: dirtyStarbeamTag,
  });
}

function consumeStarbeamTag(tag: Tag): void {
  for (const dependency of getDependencies(tag)) {
    tagFor(dependency).consume();
  }
}

function dirtyStarbeamTag(tag: CellTag): void {
  tagFor(tag).dirty();
}

function tagFor(tag: CellTag): TrackedTag {
  let tracked = STARBEAM_TAGS.get(tag);

  if (!tracked) {
    tracked = new TrackedTag();
    STARBEAM_TAGS.set(tag, tracked);
  }

  return tracked;
}
