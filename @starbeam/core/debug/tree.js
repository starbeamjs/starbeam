import treeify from "treeify";
import { isObject } from "../utils.js";
const { asTree } = treeify;
class TreeRecordBuilder {
    static build(build) {
        if (typeof build === "function") {
            let nodes = build(new TreeRecordBuilder([])).#children;
            return TreeRecord.of(nodes);
        }
        else {
            return TreeRecord.from(build);
        }
    }
    #children;
    constructor(children) {
        this.#children = children;
    }
    list(label, items, defaultValue) {
        if (items.length === 0) {
            if (defaultValue !== undefined) {
                this.#children.push(TreeEntry.create(label, TreeContent.of(defaultValue)));
            }
        }
        else {
            this.#children.push(TreeEntry.create(label, TreeList.list(items)));
        }
        return this;
    }
    entry(label, value) {
        if (typeof value === "function") {
            let record = TreeRecordBuilder.build(value);
            this.#children.push(TreeEntry.create(label, record));
        }
        else {
            this.#children.push(TreeEntry.create(label, TreeValue.value(value)));
        }
        return this;
    }
    add(...nodes) {
        this.#children.push(...nodes);
        return this;
    }
}
export const tree = TreeRecordBuilder.build;
tree.value = ((from) => TreeValue.value(from));
/**
 * A TreeEntry represents a label with an (optional) associated TreeValue
 */
export class TreeEntry {
    static create(label, value) {
        return new TreeEntry(label, value);
    }
    static from([label, value]) {
        return new TreeEntry(label, TreeValue.value(value));
    }
    #label;
    #value;
    constructor(label, value) {
        this.#label = label;
        this.#value = value;
    }
    appendTo(object) {
        this.#value.appendTo(object, this.#label);
    }
}
/**
 * A TreeValue represents the contents associated with a label. It can either be
 * an atomic value, or it can be a nested tree.
 */
export class TreeValue {
    static is(value) {
        return isObject(value) && value instanceof TreeValue;
    }
    static value(from) {
        if (typeof from === "string") {
            return TreeContent.of(from);
        }
        else if (Array.isArray(from)) {
            return TreeList.list(from);
        }
        else {
            return TreeRecord.from(from);
        }
    }
}
function isContentList(from) {
    return TreeContent.is(from[0]) || typeof from[0] === "string";
}
export class TreeList extends TreeValue {
    static list(items) {
        if (isContentList(items)) {
            return ScalarTreeList.from(items);
        }
        else {
            return RecordTreeList.from(items);
        }
    }
}
export class RecordTreeList extends TreeList {
    static is(value) {
        return isObject(value) && value instanceof RecordTreeList;
    }
    static of(items) {
        return new RecordTreeList(items);
    }
    static from(from) {
        if (RecordTreeList.is(from)) {
            return from;
        }
        return new RecordTreeList(mapPresent(from, TreeRecord.from));
    }
    #items;
    constructor(items) {
        super();
        this.#items = items;
    }
    appendTo(treeify, label) {
        let childTree = this.#items.map((item) => item.treeify());
        treeify[label] = childTree;
    }
}
/**
 * A TreeList is a list of values without children
 */
export class ScalarTreeList extends TreeList {
    static is(value) {
        return isObject(value) && value instanceof ScalarTreeList;
    }
    static of(items) {
        return new ScalarTreeList(items);
    }
    static from(from) {
        if (ScalarTreeList.is(from)) {
            return from;
        }
        return new ScalarTreeList(mapPresent(from, TreeContent.from));
    }
    #items;
    constructor(items) {
        super();
        this.#items = items;
    }
    appendTo(treeify, label) {
        let childTree = {};
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
    static is(value) {
        return isObject(value) && value instanceof TreeRecord;
    }
    static of(nodes) {
        return new TreeRecord(nodes);
    }
    static from(from) {
        if (TreeRecord.is(from)) {
            return from;
        }
        let children = Object.entries(from).map(TreeEntry.from);
        return new TreeRecord(children);
    }
    #children;
    constructor(children) {
        super();
        this.#children = children;
    }
    appendTo(treeify, label) {
        treeify[label] = this.treeify();
    }
    treeify() {
        let object = {};
        for (let child of this.#children) {
            child.appendTo(object);
        }
        return object;
    }
    stringify() {
        return asTree(this.treeify(), true, false);
    }
}
// export type IntoTreeNode =
//   | [label: string]
//   | [label: string, child: IntoTreeChildren | IntoTreeRecord | string]
//   | [TreeEntry];
function mapPresent(items, mapper) {
    return items.map(mapper);
}
export class TreeContent extends TreeValue {
    static is(value) {
        return isObject(value) && value instanceof TreeContent;
    }
    static from(content) {
        return typeof content === "string" ? new TreeContent(content) : content;
    }
    static of(atom) {
        return new TreeContent(atom);
    }
    #atom;
    constructor(atom) {
        super();
        this.#atom = atom;
    }
    appendToList(object) {
        object[this.#atom] = null;
    }
    appendTo(object, label) {
        object[label] = this.#atom;
    }
}
//# sourceMappingURL=tree.js.map