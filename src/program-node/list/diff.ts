import type { minimal } from "@domtree/flavors";
import { getPatch, Patch } from "fast-array-diff";
import type { DomEnvironment } from "../../dom/environment";
import {
  ContentCursor,
  RangeSnapshot,
  RANGE_SNAPSHOT,
} from "../../dom/streaming/cursor";
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

  range(inside: minimal.ParentNode): RangeSnapshot {
    return this.#last.range(inside);
  }

  poll(
    loop: CurrentLoop,
    inside: minimal.ParentNode,
    range: RangeSnapshot
  ): void {
    let newKeys = loop.keys;
    let diff = this.#diff(newKeys, loop, range);
    let newContent: KeyedContent[] = [];

    for (let operation of diff) {
      // console.log(`applying ${operation.describe()}`);

      let { added } = operation.apply(range.environment, inside);

      // console.log(
      //   `got:\n\n${"outerHTML" in inside ? inside.outerHTML : inside}`
      // );

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
    loop: CurrentLoop,
    range: RangeSnapshot
  ): readonly PatchOperation[] {
    let oldKeys = this.#last.keys;

    let patch = getPatch([...oldKeys], [...newKeys]) as Patch<string>;
    // console.log({ from: oldKeys, to: newKeys });
    // describePatch(patch);

    let removes = new Set(
      patch.flatMap((entry) => (entry.type === "remove" ? entry.items : []))
    );

    let operations: PatchOperation[] = [];

    for (let entry of patch) {
      switch (entry.type) {
        case "add":
          {
            for (let [i, key] of entry.items.entries()) {
              let insertion: InsertAt;
              if (entry.oldPos === 0 && i === 0) {
                if (oldKeys.length === 0) {
                  insertion = this.#insertOnly(range);
                } else {
                  insertion = this.#insertBefore(this.#existing(oldKeys[0]));
                }
              } else {
                if (entry.oldPos >= oldKeys.length) {
                  insertion = this.#insertAtEnd(range.parent);
                } else {
                  insertion = this.#insertBefore(
                    this.#existing(oldKeys[entry.oldPos])
                  );
                }
              }

              // // Get the rendered content that this item should be rendered
              // // *before*.
              // let nextKey = oldKeys[entry.oldPos + i + 1] || null;
              // let next = nextKey ? this.#existing(nextKey) : null;

              // // Get the rendered content that this item should be rendered
              // // *before*.
              // let prevKey = oldKeys[entry.oldPos + i] || null;
              // let prev = prevKey ? this.#existing(prevKey) : null;

              // let insertion = this.#insertion(next, prev, range);

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

    // console.log(operations.map((o) => o.describe()).join(""));
    return operations;
  }

  #existing(key: unknown): KeyedContent {
    return verified(this.#last.get(key), is.Present);
  }

  #insertAfter(prev: KeyedContent): InsertAt {
    return InsertAt.after(prev);
  }

  #insertBefore(next: KeyedContent): InsertAt {
    return InsertAt.before(next);
  }

  #insertOnly(range: RangeSnapshot): InsertAt {
    return InsertAt.replace(range);
  }

  #insertAtEnd(parent: minimal.ParentNode): InsertAt {
    return InsertAt.appendTo(parent);
  }
}

// function describePatch(patch: Patch<string>): void {
//   console.log({ patch: patch.map((item) => describeAnyPatchItem(item)) });
// }

// function describeAnyPatchItem(patch: PatchItem<string>): string {
//   let options = {
//     old: patch.oldPos,
//     new: patch.newPos,
//     items: patch.items,
//   } as const;

//   switch (patch.type) {
//     case "add":
//       return describePatchItem("add", options);
//     case "remove":
//       return describePatchItem("remove", options);

//     default:
//       exhaustive(patch.type, "PatchItem");
//   }
// }

// function describePatchItem(
//   op: "add" | "remove",
//   options: { old: number; new: number; items: string[] }
// ): string {
//   return `${op}(old=${options.old}, new=${options.new}) ${describeItems(
//     options.items
//   )}`;
// }

// function describeItems(items: string[]): string {
//   return `[ ` + items.map((i) => JSON.stringify(i)).join(", ") + ` ]`;
// }

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

  abstract apply(
    environment: DomEnvironment,
    inside: minimal.ParentNode
  ): Changes;

  abstract describe(): string;
}

class RemoveOperation extends PatchOperation {
  static of(keyed: KeyedContent): RemoveOperation {
    return new RemoveOperation(keyed);
  }

  private constructor(readonly keyed: KeyedContent) {
    super();
  }

  apply(environment: DomEnvironment, inside: minimal.ParentNode): Changes {
    let { keyed } = this;

    keyed.content.remove(inside);
    return { removed: keyed };
  }

  describe() {
    return `<remove ${this.keyed.key}>`;
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

  apply(environment: DomEnvironment, inside: minimal.ParentNode): Changes {
    let buffer = TreeConstructor.html(environment);
    let content = this.#keyed.render(buffer);
    this.#to.insert((cursor) => buffer.insertAt(cursor), inside);

    return { added: KeyedContent.create(this.#keyed.key, content) };
  }

  describe(): string {
    return `<insert ${this.#keyed.key} ${this.#to.describe()}>`;
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

  apply(environment: DomEnvironment, inside: minimal.ParentNode): Changes {
    this.#to.insert((cursor) => this.#keyed.content.move(cursor), inside);
    return {};
  }

  describe(): string {
    return `<move ${this.#keyed.key} ${this.#to.describe()}>`;
  }
}

export abstract class InsertAt {
  static before(keyed: KeyedContent): InsertAt {
    return new InsertBefore(keyed);
  }

  static after(keyed: KeyedContent): InsertAt {
    return new InsertAfter(keyed);
  }

  static replace(range: RangeSnapshot): InsertAt {
    return new Replace(range);
  }

  static appendTo(parent: minimal.ParentNode): InsertAt {
    return new InsertAtEnd(parent);
  }

  abstract insert<T>(
    at: (cursor: ContentCursor) => T,
    inside: minimal.ParentNode
  ): T;

  abstract describe(): string;
}

class InsertBefore extends InsertAt {
  readonly #keyed: KeyedContent;

  constructor(content: KeyedContent) {
    super();
    this.#keyed = content;
  }

  insert<T>(at: (cursor: ContentCursor) => T, inside: minimal.ParentNode): T {
    return at(this.#keyed.content[RANGE_SNAPSHOT](inside).before);
  }

  describe(): string {
    return `before:${this.#keyed.key}`;
  }
}

class InsertAtEnd extends InsertAt {
  readonly #parent: minimal.ParentNode;

  constructor(parent: minimal.ParentNode) {
    super();
    this.#parent = parent;
  }

  insert<T>(at: (cursor: ContentCursor) => T): T {
    return at(ContentCursor.create(this.#parent, null));
  }

  describe(): string {
    return `at:end`;
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

  describe(): string {
    return `after:${this.#keyed.key}`;
  }
}

class Replace extends InsertAt {
  #range: RangeSnapshot;

  constructor(range: RangeSnapshot) {
    super();
    this.#range = range;
  }

  insert<T>(at: (cursor: ContentCursor) => T, _inside: minimal.ParentNode): T {
    return at(this.#range.remove());
  }

  describe(): string {
    return `replace`;
  }
}

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
