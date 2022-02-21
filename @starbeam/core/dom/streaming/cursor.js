import { verified } from "../../strippable/assert.js";
import { assert } from "../../strippable/core.js";
import { is, mutable } from "../../strippable/minimal.js";
import { as } from "../../strippable/verify-context.js";
export class ContentCursor {
    parent;
    next;
    static create(parent, next) {
        return new ContentCursor(parent, next);
    }
    static verified(parent, next) {
        return ContentCursor.create(verified(parent, is.Present), next);
    }
    constructor(parent, next) {
        this.parent = parent;
        this.next = next;
    }
    mutate(utils) {
        return MutateContentCursor.mutate(utils, this.parent, this.next);
    }
}
export class MutateContentCursor extends ContentCursor {
    environment;
    static mutate(environment, parent, next) {
        return new MutateContentCursor(environment, parent, next);
    }
    constructor(environment, parent, next) {
        super(parent, next);
        this.environment = environment;
    }
    insertHTML(html) {
        let range = this.#asRange();
        let fragment = range.createContextualFragment(html);
        this.insert(fragment);
    }
    insert(node) {
        mutable(this.parent).insertBefore(node, this.next);
    }
    #asRange() {
        let { parent, next } = this;
        if (next === null) {
            return this.environment.utils.rangeAppendingTo(parent);
        }
        else {
            return this.environment.utils.rangeAround(next);
        }
    }
}
/**
 * A snapshot of the range for rendered content. This must be used immediately
 * and cannot be saved off.
 */
export class RangeSnapshot {
    environment;
    parent;
    first;
    last;
    static create(environment, first, last = first) {
        let parent = verified(first.parentNode, is.Present);
        assert(parent === last.parentNode, `The parentNode of the two nodes in a range must be the same`);
        return new RangeSnapshot(environment, parent, first, last);
    }
    static forContent(inside, start, end) {
        if (end) {
            let first = start[RANGE_SNAPSHOT](inside);
            let last = end[RANGE_SNAPSHOT](inside);
            return first.join(last);
        }
        else {
            return start[RANGE_SNAPSHOT](inside);
        }
    }
    constructor(environment, parent, first, last) {
        this.environment = environment;
        this.parent = parent;
        this.first = first;
        this.last = last;
    }
    get before() {
        return ContentCursor.create(this.parent, this.first);
    }
    get after() {
        return ContentCursor.create(this.parent, this.last.nextSibling);
    }
    join(other) {
        assert(this.parent === other.parent, `When joining two range snapshots, both must have the same parent, but the snapshot you passed to join() has a different parent than the snapshot you were joining it to.`);
        // TODO: Verify that `this` precedes `other`
        return new RangeSnapshot(this.environment, this.parent, this.first, other.last);
    }
    remove() {
        let range = this.#toLiveRange();
        let cursor = ContentCursor.create(this.parent, this.last.nextSibling);
        range.deleteContents();
        return cursor;
    }
    move(to) {
        let { first, last } = this;
        let current = first;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            let next = verified(current.nextSibling, is.Present, as(`nextSibling when iterating forwards through a RangeSnapshot`));
            to.mutate(this.environment).insert(current);
            if (current === last) {
                break;
            }
            else {
                current = next;
            }
        }
    }
    #toLiveRange() {
        return this.environment.utils.rangeAround(this.first, this.last);
    }
}
export const RANGE_SNAPSHOT = "RANGE_SNAPSHOT";
//# sourceMappingURL=cursor.js.map