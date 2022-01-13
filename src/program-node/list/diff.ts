import type { minimal } from "@domtree/flavors";
import { getPatch } from "fast-array-diff";
import { ContentCursor, RANGE_SNAPSHOT } from "../../dom/streaming/cursor";
import { TreeConstructor } from "../../dom/streaming/tree-constructor";
import type { ReactiveMetadata } from "../../reactive/core";
import { exhaustive, verified } from "../../strippable/assert";
import { is } from "../../strippable/minimal";
import { NonemptyList } from "../../utils";
import { OrderedIndex } from "../../utils/index-map";
import { isPresent } from "../../utils/presence";
import {
  RenderedContentMetadata,
  UPDATING_METADATA,
} from "../interfaces/rendered-content";
import type { CurrentLoop, KeyedProgramNode } from "./loop";
import { KeyedContent, RenderSnapshot } from "./snapshot";

export class ListArtifacts {
  /**
   * @param map A map of `{ key => RenderedContent } in insertion order.
   */
  static create(
    input: ReactiveMetadata,
    snapshot: RenderSnapshot
  ): ListArtifacts {
    let metadata = input.isStatic ? snapshot.metadata : UPDATING_METADATA;

    return new ListArtifacts(snapshot, metadata);
  }

  #last: RenderSnapshot;
  readonly metadata: RenderedContentMetadata;

  private constructor(last: RenderSnapshot, metadata: RenderedContentMetadata) {
    this.#last = last;
    this.metadata = metadata;
  }

  poll(loop: CurrentLoop, inside: minimal.ParentNode): void {
    // let current = [...loop.current];
    // let newKeys: readonly unknown[] = current.map((c) => c.key);
    // let components = new Map(current.map((c) => [c.key, c]));

    let newKeys = loop.keys;
    let diff = this.#diff(newKeys, loop);
    let newContent: KeyedContent[] = [];

    for (let operation of diff) {
      let { added } = operation.apply(inside);

      if (added) {
        newContent.push(added);
      }
    }

    let updates = OrderedIndex.create(newContent, (keyed) => keyed.key);

    // Get any existing rendered content that is still present in the new keys.
    // This content was neither added nor removed, so it needs to be polled to
    // apply any recursive updates.
    let pollable = this.#last.getPresent(newKeys);

    for (let keyed of pollable) {
      keyed.content.poll(inside);
    }

    let mergedIndex = this.#last.contents.mergedMap(updates);
    let newList = newKeys.map((key) => mergedIndex.get(key)).filter(isPresent);

    if (newList.length === 0) {
      throw Error("todo: Empty list");
    } else {
      this.#last = RenderSnapshot.of(NonemptyList.verify(newList));
    }
  }

  #diff(
    newKeys: readonly unknown[],
    loop: CurrentLoop
  ): readonly PatchOperation[] {
    let oldKeys = this.#last.keys;

    let patch = getPatch([...oldKeys], [...newKeys]);

    let removes = new Set(
      patch.flatMap((entry) => (entry.type === "remove" ? entry.items : []))
    );

    let operations: PatchOperation[] = [];

    for (let entry of patch) {
      switch (entry.type) {
        case "add":
          {
            for (let [i, key] of entry.items.entries()) {
              // Get the rendered content that this item should be rendered
              // *before*.
              let nextKey = oldKeys[entry.oldPos + i + 1] || null;
              let next = nextKey ? this.#existing(nextKey) : null;

              // Get the rendered content that this item should be rendered
              // *before*.
              let prevKey = oldKeys[entry.oldPos + i] || null;
              let prev = prevKey ? this.#existing(prevKey) : null;

              let insertion = this.#insertion(next, prev);

              if (removes.has(key)) {
                removes.delete(key);
                let current = verified(this.#last.get(key), is.Present);

                operations.push(MoveOperation.create(current, insertion));
              } else {
                operations.push(
                  InsertOperation.create(
                    verified(loop.get(key), is.Present),
                    insertion
                  )
                );
              }
            }
          }
          break;

        case "remove":
          // do nothing
          break;
        default:
          exhaustive(entry.type, "PatchItem");
      }
    }

    for (let remove of removes) {
      operations.push(PatchOperation.remove(this.#existing(remove)));
    }

    return operations;
  }

  #existing(key: unknown): KeyedContent {
    return verified(this.#last.get(key), is.Present);
  }

  #insertion(next: KeyedContent | null, prev: KeyedContent | null): InsertAt {
    if (next === null) {
      if (prev === null) {
        return REPLACE;
      } else {
        return InsertAt.after(prev);
      }
    } else {
      return InsertAt.before(next);
    }
  }
}

interface Changes {
  readonly added?: KeyedContent;
  readonly removed?: KeyedContent;
}

export abstract class PatchOperation {
  static insert(keyed: KeyedProgramNode, to: InsertAt): PatchOperation {
    return InsertOperation.create(keyed, to);
  }

  static move(keyed: KeyedContent, to: InsertAt): PatchOperation {
    return MoveOperation.create(keyed, to);
  }

  static remove(keyed: KeyedContent): RemoveOperation {
    return RemoveOperation.of(keyed);
  }

  abstract apply(inside: minimal.ParentNode): Changes;
}

class RemoveOperation extends PatchOperation {
  static of(keyed: KeyedContent): RemoveOperation {
    return new RemoveOperation(keyed);
  }

  private constructor(readonly keyed: KeyedContent) {
    super();
  }

  apply(inside: minimal.ParentNode): Changes {
    let { keyed } = this;

    keyed.content.remove(inside);
    return { removed: keyed };
  }
}

class InsertOperation extends PatchOperation {
  static create(content: KeyedProgramNode, to: InsertAt): InsertOperation {
    return new InsertOperation(content, to);
  }

  readonly #keyed: KeyedProgramNode;
  readonly #to: InsertAt;

  private constructor(keyed: KeyedProgramNode, to: InsertAt) {
    super();
    this.#keyed = keyed;
    this.#to = to;
  }

  apply(inside: minimal.ParentNode): Changes {
    let buffer = TreeConstructor.html();
    let content = this.#keyed.render(buffer);
    this.#to.insert((cursor) => buffer.insertAt(cursor), inside);

    return { added: KeyedContent.create(this.#keyed.key, content) };
  }

  insert(keyed: KeyedProgramNode, at: ContentCursor): Changes {
    let buffer = TreeConstructor.html();
    let content = keyed.render(buffer);
    buffer.insertAt(at);

    return { added: KeyedContent.create(keyed.key, content) };
  }
}

class MoveOperation extends PatchOperation {
  static create(keyed: KeyedContent, to: InsertAt): MoveOperation {
    return new MoveOperation(keyed, to);
  }

  readonly #keyed: KeyedContent;
  readonly #to: InsertAt;

  private constructor(keyed: KeyedContent, to: InsertAt) {
    super();
    this.#keyed = keyed;
    this.#to = to;
  }

  apply(inside: minimal.ParentNode): Changes {
    this.#to.insert((cursor) => this.#keyed.content.move(cursor), inside);
    return {};
  }
}

export abstract class InsertAt {
  static before(keyed: KeyedContent): InsertAt {
    return new InsertBefore(keyed);
  }

  static after(keyed: KeyedContent): InsertAt {
    return new InsertAfter(keyed);
  }

  static get replace(): InsertAt {
    return REPLACE;
  }

  abstract insert<T>(
    at: (cursor: ContentCursor) => T,
    inside: minimal.ParentNode
  ): T;
}

class InsertBefore extends InsertAt {
  #keyed: KeyedContent;

  constructor(content: KeyedContent) {
    super();
    this.#keyed = content;
  }

  insert<T>(at: (cursor: ContentCursor) => T, inside: minimal.ParentNode): T {
    return at(this.#keyed.content[RANGE_SNAPSHOT](inside).before);
  }
}

class InsertAfter extends InsertAt {
  #keyed: KeyedContent;

  constructor(content: KeyedContent) {
    super();
    this.#keyed = content;
  }

  insert<T>(at: (cursor: ContentCursor) => T, inside: minimal.ParentNode): T {
    return at(this.#keyed.content[RANGE_SNAPSHOT](inside).after);
  }
}

class Replace extends InsertAt {
  insert<T>(_at: (cursor: ContentCursor) => T, _inside: minimal.ParentNode): T {
    throw Error("todo: Replace#insert");
  }
}

const REPLACE = new Replace();

// type InsertAt =
//   | {
//       type: "before";
//       content: RenderedContent;
//     }
//   | {
//       type: "after";
//       content: RenderedContent;
//     }
//   | {
//       // Replaces the "empty"
//       type: "replace";
//     };

// function InsertBefore(keyed: KeyedContent): InsertAt {
//   return {
//     type: "before",
//     content: keyed.content,
//   };
// }

// function InsertAfter(keyed: KeyedContent): InsertAt {
//   return {
//     type: "after",
//     content: keyed.content,
//   };
// }

// const REPLACE: InsertAt = { type: "replace" } as const;
