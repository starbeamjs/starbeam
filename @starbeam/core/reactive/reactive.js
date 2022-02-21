import { isObject } from "../utils.js";
import { ExtendsReactive } from "./base.js";
import { Static } from "./static.js";
export const Reactive = {
    from(reactive) {
        if (Reactive.is(reactive)) {
            return reactive;
        }
        else {
            return new Static(reactive);
        }
    },
    is(reactive) {
        return isObject(reactive) && reactive instanceof ExtendsReactive;
    },
};
//# sourceMappingURL=reactive.js.map