import { ReactiveMetadata } from "../core/metadata.js";
import { describeValue } from "../describe.js";
import { ExtendsReactive } from "./base.js";
import { REACTIVE_BRAND } from "./internal.js";
export class Static extends ExtendsReactive {
    current;
    description;
    constructor(current, description = `a static ${describeValue(current)}`) {
        super({
            name: "Static",
            description,
        });
        this.current = current;
        this.description = description;
        REACTIVE_BRAND.brand(this);
    }
    metadata = ReactiveMetadata.Constant;
    cells = [];
}
//# sourceMappingURL=static.js.map