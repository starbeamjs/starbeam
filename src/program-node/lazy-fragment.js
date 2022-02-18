import { verified } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
import { as } from "../strippable/verify-context.js";
export class LazyFragment {
    static of(lazy) {
        return new LazyFragment(lazy, undefined);
    }
    #lazy;
    #placeholder;
    constructor(lazy, placeholder) {
        this.#lazy = lazy;
        this.#placeholder = placeholder;
    }
    get environment() {
        return this.#lazy.environment;
    }
    initialize(inside) {
        this.#lazy.get(inside);
    }
    get(inside) {
        if (this.#placeholder === undefined) {
            this.#placeholder = verified(this.#lazy.get(inside).asNode(), is.Comment, as(`the ContentRange for a rendered list`).when(`the list was empty`));
        }
        return verified(this.#placeholder, is.Present, as(`The ContentRange for a rendered list`).when(`the list was empty`));
    }
    set(placeholder) {
        this.#placeholder = placeholder;
    }
}
//# sourceMappingURL=lazy-fragment.js.map