import { consumeTag, createTag, dirtyTag } from "@glimmer/validator";

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
