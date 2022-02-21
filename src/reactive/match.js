import { ReactiveMetadata } from "../core/metadata.js";
import { Abstraction } from "../index.js";
import { ExtendsReactive } from "./base.js";
export class ReactiveMatch extends ExtendsReactive {
    description;
    static match(reactive, matcher, description = Abstraction.callerFrame()) {
        return new ReactiveMatch(reactive, matcher, description);
    }
    #reactive;
    #matcher;
    constructor(reactive, matcher, description) {
        super({
            name: "Match",
            description,
        });
        this.description = description;
        this.#reactive = reactive;
        this.#matcher = matcher;
    }
    get current() {
        let { discriminant, value } = this.#reactive.current;
        let matcher = this.#matcher[discriminant];
        return matcher(value?.current);
    }
    get cells() {
        return this.#reactive.cells;
    }
    get metadata() {
        if (this.#reactive.isConstant()) {
            let { value } = this.#reactive.current;
            if (value === undefined) {
                return ReactiveMetadata.Constant;
            }
            else {
                return value.metadata;
            }
        }
        else {
            return ReactiveMetadata.Dynamic;
        }
    }
}
//# sourceMappingURL=match.js.map