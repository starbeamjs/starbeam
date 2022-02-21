import { ReactiveMetadata } from "../core/metadata.js";
import { TIMELINE } from "../core/timeline/timeline.js";
import { describeValue } from "../describe.js";
import { IS_UPDATED_SINCE } from "../fundamental/constants.js";
import { Abstraction } from "../index.js";
import { verify } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
import { expected } from "../strippable/verify-context.js";
import { ExtendsReactive } from "./base.js";
import { REACTIVE_BRAND } from "./internal.js";
export class ReactiveCell extends ExtendsReactive {
    static create(value, description) {
        return new ReactiveCell(value, TIMELINE.now, description, false);
    }
    #value;
    #lastUpdate;
    #description;
    #frozen;
    constructor(value, lastUpdate, description, frozen) {
        super({
            name: "Cell",
            description,
        });
        REACTIVE_BRAND.brand(this);
        this.#value = value;
        this.#lastUpdate = lastUpdate;
        this.#description = description;
        this.#frozen = frozen;
    }
    get description() {
        return `${this.#description} (current value = ${describeValue(this.#value)})`;
    }
    get metadata() {
        return this.#frozen ? ReactiveMetadata.Constant : ReactiveMetadata.Dynamic;
    }
    get cells() {
        return [this];
    }
    freeze() {
        this.#frozen = true;
    }
    update(value) {
        verify(this.#frozen, is.value(false), expected(`a cell`)
            .toBe(`non-frozen`)
            .when(`updating a cell`)
            .butGot(() => `a frozen cell`));
        this.#value = value;
        this.#lastUpdate = TIMELINE.bump(this);
    }
    get current() {
        if (!this.#frozen) {
            TIMELINE.didConsume(this);
        }
        return this.#value;
    }
    toString() {
        return `Reactive (${this.#description})`;
    }
    [IS_UPDATED_SINCE](timestamp) {
        return this.#lastUpdate.gt(timestamp);
    }
}
export function Cell(value, description = Abstraction.callerFrame()) {
    return ReactiveCell.create(value, description);
}
Cell.is = (value) => {
    return value instanceof ReactiveCell;
};
//# sourceMappingURL=cell.js.map