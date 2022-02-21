import type { TreeObject } from "treeify";
import treeify from "treeify";
import { isObject } from "../utils.js";

const { asTree } = treeify;

interface TreeifyObject {
  [k: string]: TreeifyValue;
}
export type TreeifyValue = string | TreeifyObject | TreeifyObject[] | null;

export type IntoTreeRecord = {
  [key: string]: IntoTreeValue;
};

export interface BuildTree {
  (build: (builder: TreeRecordBuilder) => TreeRecordBuilder): TreeRecord;
  (build: IntoTreeRecord): TreeRecord;

  value(value: string): TreeContent;
  value(value: IntoTreeRecord): TreeRecord;
  value(value: IntoTreeList): TreeList;
  value(value: IntoTreeValue): TreeValue;
}

class TreeRecordBuilder {
  static build(
    build: ((builder: TreeRecordBuilder) => TreeRecordBuilder) | IntoTreeRecord
  ): TreeRecord {
    if (typeof build === "function") {
      let nodes = build(new TreeRecordBuilder([])).#children;
      return TreeRecord.of(nodes as readonly TreeEntry[]);
    } else {
      return TreeRecord.from(build);
    }
  }

  readonly #children: TreeEntry[];

  private constructor(children: TreeEntry[]) {
    this.#children = children;
  }

  list(
    label: string,
    items: string[] | TreeContent[] | (TreeRecord | IntoTreeRecord)[],
    defaultValue?: string
  ): this {
    if (items.length === 0) {
      if (defaultValue !== undefined) {
        this.#children.push(
          TreeEntry.create(label, TreeContent.of(defaultValue))
        );
      }
    } else {
      this.#children.push(
        TreeEntry.create(label, TreeList.list(items as IntoTreeList))
      );
    }

    return this;
  }

  entry(
    label: string,
    value: IntoTreeValue | ((builder: TreeRecordBuilder) => TreeRecordBuilder)
  ): this {
    if (typeof value === "function") {
      let record = TreeRecordBuilder.build(value);
      this.#children.push(TreeEntry.create(label, record));
    } else {
      this.#children.push(TreeEntry.create(label, TreeValue.value(value)));
    }

    return this;
  }

  add(...nodes: TreeEntry[]): this {
    this.#children.push(...nodes);
    return this;
  }
}

export const tree = TreeRecordBuilder.build as BuildTree;

tree.value = ((from: IntoTreeValue): TreeValue =>
  TreeValue.value(from)) as BuildTree["value"];

export type IntoTreeEntry = [label: string, value: IntoTreeValue];

/**
 * A TreeEntry represents a label with an (optional) associated TreeValue
 */
export class TreeEntry {
  static create(label: string, value: TreeValue): TreeEntry {
    return new TreeEntry(label, value);
  }

  static from([label, value]: IntoTreeEntry): TreeEntry {
    return new TreeEntry(label, TreeValue.value(value));
  }

  readonly #label: string;
  readonly #value: TreeValue;

  private constructor(label: string, value: TreeValue) {
    this.#label = label;
    this.#value = value;
  }

  appendTo(object: TreeifyObject): void {
    this.#value.appendTo(object, this.#label);
  }
}

export type IntoTreeValue = string | IntoTreeRecord | IntoTreeList;

/**
 * A TreeValue represents the contents associated with a label. It can either be
 * an atomic value, or it can be a nested tree.
 */
export abstract class TreeValue {
  static is(value: unknown): value is TreeValue {
    return isObject(value) && value instanceof TreeValue;
  }

  static value(from: IntoTreeValue): TreeValue {
    if (typeof from === "string") {
      return TreeContent.of(from);
    } else if (Array.isArray(from)) {
      return TreeList.list(from);
    } else {
      return TreeRecord.from(from);
    }
  }

  abstract appendTo(treeify: TreeifyObject, label: string): void;
}

export type IntoTreeListItem = string | IntoTreeRecord;
export type TreeListItem = TreeContent | TreeRecord;

export type IntoTreeRecordValue = IntoTreeRecord | TreeRecord;

export type IntoTreeList =
  | [IntoTreeContent, ...IntoTreeContent[]]
  | [IntoTreeRecordValue, ...IntoTreeRecordValue[]];

function isContentList(
  from: IntoTreeList
): from is [IntoTreeContent, ...IntoTreeContent[]] {
  return TreeContent.is(from[0]) || typeof from[0] === "string";
}

export abstract class TreeList extends TreeValue {
  static list(items: IntoTreeList): TreeList {
    if (isContentList(items)) {
      return ScalarTreeList.from(items);
    } else {
      return RecordTreeList.from(items);
    }
  }
}

export class RecordTreeList extends TreeList {
  static is(value: unknown): value is RecordTreeList {
    return isObject(value) && value instanceof RecordTreeList;
  }

  static of(items: [TreeRecord, ...TreeRecord[]]) {
    return new RecordTreeList(items);
  }

  static from(
    from:
      | RecordTreeList
      | [IntoTreeRecord | TreeRecord, ...(IntoTreeRecord | TreeRecord)[]]
  ): RecordTreeList {
    if (RecordTreeList.is(from)) {
      return from;
    }

    return new RecordTreeList(mapPresent(from, TreeRecord.from));
  }

  readonly #items: [TreeRecord, ...TreeRecord[]];

  private constructor(items: [TreeRecord, ...TreeRecord[]]) {
    super();
    this.#items = items;
  }

  appendTo(treeify: TreeifyObject, label: string): void {
    let childTree: TreeifyObject[] = this.#items.map((item) => item.treeify());
    treeify[label] = childTree;
  }
}

/**
 * A TreeList is a list of values without children
 */
export class ScalarTreeList extends TreeList {
  static is(value: unknown): value is ScalarTreeList {
    return isObject(value) && value instanceof ScalarTreeList;
  }

  static of(items: [TreeContent, ...TreeContent[]]) {
    return new ScalarTreeList(items);
  }

  static from(
    from: ScalarTreeList | [IntoTreeContent, ...IntoTreeContent[]]
  ): ScalarTreeList {
    if (ScalarTreeList.is(from)) {
      return from;
    }

    return new ScalarTreeList(mapPresent(from, TreeContent.from));
  }

  readonly #items: [TreeContent, ...TreeContent[]];

  private constructor(items: [TreeContent, ...TreeContent[]]) {
    super();
    this.#items = items;
  }

  appendTo(treeify: TreeifyObject, label: string): void {
    let childTree: TreeifyObject = {};

    for (let item of this.#items) {
      item.appendToList(childTree);
    }

    treeify[label] = childTree;
  }
}

/**
 * A TreeRecord is a TreeValue that can *also* serve as the root of a tree.
 */
export class TreeRecord extends TreeValue {
  static is(value: unknown): value is TreeRecord {
    return isObject(value) && value instanceof TreeRecord;
  }

  static of(nodes: readonly TreeEntry[]): TreeRecord {
    return new TreeRecord(nodes);
  }

  static from(from: IntoTreeRecord | TreeRecord): TreeRecord {
    if (TreeRecord.is(from)) {
      return from;
    }

    let children = Object.entries(from).map(TreeEntry.from);

    return new TreeRecord(children);
  }

  readonly #children: readonly TreeEntry[];

  private constructor(children: readonly TreeEntry[]) {
    super();
    this.#children = children;
  }

  appendTo(treeify: TreeifyObject, label: string): void {
    treeify[label] = this.treeify();
  }

  treeify(): TreeifyObject {
    let object: TreeifyObject = {};

    for (let child of this.#children) {
      child.appendTo(object);
    }

    return object;
  }

  stringify(): string {
    return asTree(this.treeify() as TreeObject, true, false);
  }
}

// export type IntoTreeNode =
//   | [label: string]
//   | [label: string, child: IntoTreeChildren | IntoTreeRecord | string]
//   | [TreeEntry];

function mapPresent<T, U>(
  items: [T, ...T[]],
  mapper: (item: T) => U
): [U, ...U[]] {
  return items.map(mapper) as [U, ...U[]];
}

// export type TreeChildren = [TreeEntry, ...TreeEntry[]];

// export type IntoTreeValue = string | IntoTreeRecord;

// function valueFrom(from: IntoTreeValue): TreeValue {
//   if (typeof from === "string") {
//     return Content.of(from);
//   } else {
//     return TreeRecord.from(from);
//   }
// }

export type IntoTreeContent = string | TreeContent;

export class TreeContent extends TreeValue {
  static is(value: unknown): value is TreeContent {
    return isObject(value) && value instanceof TreeContent;
  }

  static from(content: IntoTreeContent): TreeContent {
    return typeof content === "string" ? new TreeContent(content) : content;
  }

  static of(atom: string): TreeContent {
    return new TreeContent(atom);
  }

  readonly #atom: string;

  private constructor(atom: string) {
    super();
    this.#atom = atom;
  }

  appendToList(object: TreeifyObject): void {
    object[this.#atom] = null;
  }

  appendTo(object: TreeifyObject, label: string): void {
    object[label] = this.#atom;
  }
}
