import { ExtendsReactive } from "./base.js";
import { HasMetadata, ReactiveMetadata } from "../core/metadata.js";
import { REACTIVE_BRAND } from "./internal.js";
import { describeValue } from "../describe.js";
export class Static extends ExtendsReactive {
    current;
    description;
    constructor(current, description = `a static ${describeValue(current)}`) {
        super();
        this.current = current;
        this.description = description;
        REACTIVE_BRAND.brand(this);
    }
    metadata = ReactiveMetadata.Constant;
}
//# sourceMappingURL=static.js.map