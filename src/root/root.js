import { LOGGER } from "../strippable/trace.js";
export class RenderedRoot {
    static create({ rendered, container, }) {
        return new RenderedRoot(rendered, container);
    }
    #rendered;
    #container;
    constructor(rendered, container) {
        this.#rendered = rendered;
        this.#container = container;
    }
    get metadata() {
        return this.#rendered.metadata;
    }
    /**
     * Eagerly exchange all tokens for their DOM representations. This is
     * primarily useful if you want to look at the DOM without markers.
     */
    initialize() {
        LOGGER.trace.group(`\ninitializing rendered root`, () => this.#rendered.initialize(this.#container));
        return this;
    }
    poll() {
        LOGGER.trace.group(`\npolling rendered root`, () => this.#rendered.poll(this.#container));
    }
}
//# sourceMappingURL=root.js.map