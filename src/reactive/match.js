import { ExtendsReactive } from "./base.js";
import { ReactiveMetadata } from "../core/metadata.js";
export class ReactiveMatch extends ExtendsReactive {
    description;
    static match(reactive, matcher, description) {
        return new ReactiveMatch(reactive, matcher, description);
    }
    #reactive;
    #matcher;
    constructor(reactive, matcher, description) {
        super();
        this.description = description;
        this.#reactive = reactive;
        this.#matcher = matcher;
    }
    get current() {
        let { discriminant, value } = this.#reactive.current;
        let matcher = this.#matcher[discriminant];
        return matcher(value?.current);
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