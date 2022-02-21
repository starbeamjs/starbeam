import { HasMetadata, ReactiveMetadata } from "../metadata.js";
import { LOGGER } from "../../strippable/trace.js";
import { IS_UPDATED_SINCE } from "../../fundamental/constants.js";
export class AssertFrame {
    static describing(description) {
        return new AssertFrame(description);
    }
    #description;
    constructor(description) {
        this.#description = description;
    }
    assert() {
        throw Error(`The current timestamp should not change while ${this.#description}`);
    }
}
export class ActiveFrame {
    description;
    static create(description) {
        return new ActiveFrame(new Set(), description);
    }
    #cells;
    constructor(cells, description) {
        this.description = description;
        this.#cells = cells;
    }
    add(cell) {
        this.#cells.add(cell);
    }
    finalize(value, now) {
        return {
            frame: new FinalizedFrame(this.#cells, now, value, this.description),
            initial: value,
        };
    }
}
export class FinalizedFrame extends HasMetadata {
    description;
    #children;
    #finalizedAt;
    #value;
    constructor(children, finalizedAt, value, description) {
        super();
        this.description = description;
        this.#children = children;
        this.#finalizedAt = finalizedAt;
        this.#value = value;
    }
    get metadata() {
        return ReactiveMetadata.all(...this.#children);
    }
    get cells() {
        return [...this.#children].flatMap((child) => child instanceof FinalizedFrame ? child.cells : child);
    }
    [IS_UPDATED_SINCE](timestamp) {
        let isUpdated = false;
        for (let child of this.#children) {
            if (child[IS_UPDATED_SINCE](timestamp)) {
                LOGGER.trace.log(`[invalidated] by ${child.description || "anonymous"}`);
                isUpdated = true;
            }
        }
        return isUpdated;
    }
    validate() {
        if (this[IS_UPDATED_SINCE](this.#finalizedAt)) {
            return { status: "invalid" };
        }
        return { status: "valid", value: this.#value };
    }
}
//# sourceMappingURL=frames.js.map