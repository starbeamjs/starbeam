import { getPatch } from "fast-array-diff";
import { ContentCursor, RangeSnapshot, RANGE_SNAPSHOT, } from "../../dom/streaming/cursor.js";
import { TreeConstructor } from "../../dom/streaming/tree-constructor.js";
import { exhaustive, verified } from "../../strippable/assert.js";
import { is } from "../../strippable/minimal.js";
import { NonemptyList } from "../../utils.js";
import { OrderedIndex } from "../../utils/index-map.js";
import { isPresent } from "../../utils/presence.js";
import { KeyedContent, RenderSnapshot } from "./snapshot.js";
export class ListArtifacts {
    /**
     * @param map A map of `{ key => RenderedContent } in insertion order.
     */
    static create(input, snapshot) {
        return new ListArtifacts(snapshot, input);
    }
    #last;
    metadata;
    constructor(last, metadata) {
        this.#last = last;
        this.metadata = metadata;
    }
    isEmpty() {
        return this.#last.isEmpty();
    }
    get boundaries() {
        return this.#last.boundaries;
    }
    initialize(inside) {
        this.#last.initialize(inside);
    }
    poll(loop, inside, range) {
        if (this.isEmpty() && loop.isEmpty()) {
            return;
        }
        let newKeys = loop.keys;
        let diff = this.#diff(newKeys, loop, range);
        let newContent = [];
        let placeholder = null;
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
        let newList = newKeys.map((key) => mergedIndex.get(key)).filter(isPresent);
        if (newList.length === 0) {
            this.#last = RenderSnapshot.of(null);
        }
        else {
            this.#last = RenderSnapshot.of(NonemptyList.verified(newList));
        }
        return placeholder;
    }
    #diff(newKeys, loop, range) {
        let oldKeys = this.#last.keys;
        let patch = getPatch([...oldKeys], [...newKeys]);
        // console.log({ from: oldKeys, to: newKeys });
        // describePatch(patch);
        let removes = new Set(patch.flatMap((entry) => (entry.type === "remove" ? entry.items : [])));
        let operations = [];
        for (let entry of patch) {
            switch (entry.type) {
                case "add":
                    {
                        for (let [i, key] of entry.items.entries()) {
                            let insertion;
                            if (entry.oldPos === 0 && i === 0) {
                                if (oldKeys.length === 0) {
                                    insertion = this.#insertOnly(range);
                                }
                                else {
                                    insertion = this.#insertBeforeContent(this.#existing(oldKeys[0]));
                                }
                            }
                            else {
                                if (entry.oldPos >= oldKeys.length) {
                                    insertion = this.#insertAtCursor(range.after);
                                }
                                else {
                                    insertion = this.#insertBeforeContent(this.#existing(oldKeys[entry.oldPos]));
                                }
                            }
                            if (removes.has(key)) {
                                removes.delete(key);
                                let current = verified(this.#last.get(key), is.Present);
                                operations.push(MoveOperation.create(current, insertion));
                            }
                            else {
                                operations.push(InsertOperation.create(verified(loop.get(key), is.Present), insertion));
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
    #existing(key) {
        return verified(this.#last.get(key), is.Present);
    }
    #insertBeforeContent(next) {
        return InsertAt.beforeContent(next);
    }
    #insertOnly(range) {
        return InsertAt.replace(range);
    }
    #insertAtCursor(cursor) {
        return InsertAt.insertAtCursor(cursor);
    }
}
export class PatchOperation {
    static insert(keyed, to) {
        return InsertOperation.create(keyed, to);
    }
    static move(keyed, to) {
        return MoveOperation.create(keyed, to);
    }
    static remove(keyed) {
        return RemoveOperation.of(keyed);
    }
}
class RemoveOperation extends PatchOperation {
    keyed;
    static of(keyed) {
        return new RemoveOperation(keyed);
    }
    constructor(keyed) {
        super();
        this.keyed = keyed;
    }
    apply(environment, inside) {
        let { keyed } = this;
        keyed.content.remove(inside);
        return { removed: keyed };
    }
    describe() {
        return `<remove ${this.keyed.key}>`;
    }
}
class InsertOperation extends PatchOperation {
    static create(content, to) {
        return new InsertOperation(content, to);
    }
    #keyed;
    #to;
    constructor(keyed, to) {
        super();
        this.#keyed = keyed;
        this.#to = to;
    }
    apply(environment, inside) {
        let buffer = TreeConstructor.html(environment);
        let content = this.#keyed.render(buffer);
        this.#to.insert((cursor) => buffer.insertAt(cursor), inside);
        return { added: KeyedContent.create(this.#keyed.key, content) };
    }
    describe() {
        return `<insert ${this.#keyed.key} ${this.#to.describe()}>`;
    }
}
class MoveOperation extends PatchOperation {
    static create(keyed, to) {
        return new MoveOperation(keyed, to);
    }
    #keyed;
    #to;
    constructor(keyed, to) {
        super();
        this.#keyed = keyed;
        this.#to = to;
    }
    apply(environment, inside) {
        this.#to.insert((cursor) => this.#keyed.content.move(cursor), inside);
        return {};
    }
    describe() {
        return `<move ${this.#keyed.key} ${this.#to.describe()}>`;
    }
}
export class InsertAt {
    static beforeContent(keyed) {
        return new InsertBefore(keyed);
    }
    static after(keyed) {
        return new InsertAfter(keyed);
    }
    static replace(range) {
        return new Replace(range);
    }
    static insertAtCursor(cursor) {
        return new InsertACursor(cursor);
    }
}
class InsertBefore extends InsertAt {
    #keyed;
    constructor(content) {
        super();
        this.#keyed = content;
    }
    insert(at, inside) {
        return at(this.#keyed.content[RANGE_SNAPSHOT](inside).before);
    }
    describe() {
        return `before:${this.#keyed.key}`;
    }
}
class InsertACursor extends InsertAt {
    #cursor;
    constructor(cursor) {
        super();
        this.#cursor = cursor;
    }
    insert(at) {
        return at(this.#cursor);
    }
    describe() {
        return `at:end`;
    }
}
class InsertAfter extends InsertAt {
    #keyed;
    constructor(content) {
        super();
        this.#keyed = content;
    }
    insert(at, inside) {
        return at(this.#keyed.content[RANGE_SNAPSHOT](inside).after);
    }
    describe() {
        return `after:${this.#keyed.key}`;
    }
}
class Replace extends InsertAt {
    #range;
    constructor(range) {
        super();
        this.#range = range;
    }
    insert(at, _inside) {
        return at(this.#range.remove());
    }
    describe() {
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
//# sourceMappingURL=diff.js.map