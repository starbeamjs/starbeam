import type { minimal } from "@domtree/flavors";
import {
  exhaustive,
  is,
  NonemptyList,
  OrderedIndex,
  verified,
  type ReactiveMetadata,
} from "@starbeam/core";
import { getPatch, type Patch } from "fast-array-diff";
import type { DomEnvironment } from "../../dom/environment.js";
import {
  ContentCursor,
  RangeSnapshot,
  RANGE_SNAPSHOT,
} from "../../dom/streaming/cursor.js";
import { TreeConstructor } from "../../dom/streaming/tree-constructor.js";
import type { CurrentLoop, KeyedProgramNode } from "./loop.js";
import { KeyedContent, RenderSnapshot } from "./snapshot.js";

export class ListArtifacts {
  /**
   * @param map A map of `{ key => RenderedContent } in insertion order.
   */
  static create(
    input: ReactiveMetadata,
    snapshot: RenderSnapshot
  ): ListArtifacts {
    return new ListArtifacts(snapshot, input);
  }

  #last: RenderSnapshot;
  readonly metadata: ReactiveMetadata;

  private constructor(last: RenderSnapshot, metadata: ReactiveMetadata) {
    this.#last = last;
    this.metadata = metadata;
  }

  isEmpty(): boolean {
    return this.#last.isEmpty();
  }

  get boundaries(): [first: KeyedContent, last: KeyedContent] | null {
    return this.#last.boundaries;
  }

  initialize(inside: minimal.ParentNode): void {
    this.#last.initialize(inside);
  }

  poll(
    loop: CurrentLoop,
    inside: minimal.ParentNode,
    range: RangeSnapshot
  ): minimal.ChildNode | null | undefined {
    if (this.isEmpty() && loop.isEmpty()) {
      return;
    }

    let newKeys = loop.keys;
    let diff = this.#diff(newKeys, loop, range);
    let newContent: KeyedContent[] = [];

    let placeholder: minimal.ChildNode | null = null;

    if (newKeys.length === 0) {
      placeholder = range.environment.utils.createPlaceholder();
      range.after.mutate(range.environment).insert(placeholder);
    }

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
    let newList = newKeys.map((key) => mergedIndex.get(key)).filter(is.Present);

    if (newList.length === 0) {
      this.#last = RenderSnapshot.of(null);
    } else {
      this.#last = RenderSnapshot.of(NonemptyList.verified(newList));
    }

    return placeholder;
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
                  insertion = this.#insertBeforeContent(
                    this.#existing(oldKeys[0])
                  );
                }
              } else {
                if (entry.oldPos >= oldKeys.length) {
                  insertion = this.#insertAtCursor(range.after);
                } else {
                  insertion = this.#insertBeforeContent(
                    this.#existing(oldKeys[entry.oldPos])
                  );
                }
              }

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

  #insertBeforeContent(next: KeyedContent): InsertAt {
    return InsertAt.beforeContent(next);
  }

  #insertOnly(range: RangeSnapshot): InsertAt {
    return InsertAt.replace(range);
  }

  #insertAtCursor(cursor: ContentCursor): InsertAt {
    return InsertAt.insertAtCursor(cursor);
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
  static beforeContent(keyed: KeyedContent): InsertAt {
    return new InsertBefore(keyed);
  }

  static after(keyed: KeyedContent): InsertAt {
    return new InsertAfter(keyed);
  }

  static replace(range: RangeSnapshot): InsertAt {
    return new Replace(range);
  }

  static insertAtCursor(cursor: ContentCursor): InsertAt {
    return new InsertACursor(cursor);
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

class InsertACursor extends InsertAt {
  readonly #cursor: ContentCursor;

  constructor(cursor: ContentCursor) {
    super();
    this.#cursor = cursor;
  }

  insert<T>(at: (cursor: ContentCursor) => T): T {
    return at(this.#cursor);
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
