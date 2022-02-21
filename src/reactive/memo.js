import { ReactiveMetadata } from "../core/metadata.js";
import { TIMELINE } from "../core/timeline/timeline.js";
import { UNINITIALIZED } from "../fundamental/constants.js";
import { Group, LOGGER } from "../strippable/trace.js";
import { ExtendsReactive } from "./base.js";
export class ReactiveMemo extends ExtendsReactive {
    static create(callback, description) {
        return new ReactiveMemo(callback, description);
    }
    #callback;
    #frame = null;
    /**
     * Every time the callback is called, the metadata for this function has an
     * opportunity to switch from dynamic to constant.
     */
    #metadata = ReactiveMetadata.Dynamic;
    #description;
    constructor(callback, description) {
        super({
            name: "Memo",
            description,
        });
        this.#callback = callback;
        this.#description = description;
    }
    get description() {
        return this.#description;
    }
    get metadata() {
        if (this.#frame) {
            return this.#frame.metadata;
        }
        else {
            return ReactiveMetadata.Dynamic;
        }
    }
    get cells() {
        if (this.#frame) {
            return this.#frame.cells;
        }
        else {
            return UNINITIALIZED;
        }
    }
    get current() {
        let group;
        if (this.#frame) {
            let validationGroup = LOGGER.trace
                .group(`validating ${this.#description} (parent = ${this.#frame.description})`)
                .expanded();
            let validation = this.#frame.validate();
            if (validation.status === "valid") {
                LOGGER.trace.log(`=> valid frame for ${this.#description}`);
                validationGroup.end();
                TIMELINE.didConsume(this.#frame);
                return validation.value;
            }
            else {
                validationGroup.end();
                group = LOGGER.trace
                    .group(`recomputing memo: ${this.#description}`)
                    .expanded();
            }
        }
        else {
            group = LOGGER.trace
                .group(`initializing memo: ${this.#description}`)
                .expanded();
        }
        let newFrame;
        try {
            let { frame, initial } = TIMELINE.withFrame(this.#callback, `memo: ${this.#description}`);
            this.#metadata = frame.metadata;
            this.#frame = newFrame = frame;
            return initial;
        }
        finally {
            group.end();
            TIMELINE.didConsume(newFrame);
        }
    }
    toString() {
        return `Reactive (${this.#description})`;
    }
}
//# sourceMappingURL=memo.js.map