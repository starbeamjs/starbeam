import { LIFETIME } from "../core/lifetime/lifetime.js";
import { HookBlueprint, SimpleHook } from "../hooks/simple.js";
import { assert } from "../strippable/core.js";
import { LOGGER } from "../strippable/trace.js";
import { AbstractProgramNode, RenderedProgramNode } from "./program-node.js";
const UNINITIALIZED = Symbol("UNINITIALIZED");
/**
 * This value is a sink for hooks. Importantly, if you finalize this value, its
 * source will also be finalized.
 */
export class HookValue {
    static create() {
        return new HookValue(UNINITIALIZED);
    }
    /** @internal */
    static update(slot, value) {
        slot.#value = value;
    }
    #value;
    constructor(value) {
        this.#value = value;
    }
    get current() {
        assert(this.#value !== UNINITIALIZED, `A top-level hook value cannot be observed before the app was rendered`);
        return this.#value;
    }
}
export class HookCursor {
    static create() {
        return new HookCursor();
    }
}
export class HookProgramNode extends AbstractProgramNode {
    static create(universe, hook) {
        return new HookProgramNode(universe, SimpleHook.construct(hook));
    }
    #universe;
    #hook;
    constructor(universe, hook) {
        super();
        this.#universe = universe;
        this.#hook = hook;
    }
    get metadata() {
        return this.#hook.metadata;
    }
    render() {
        return RenderedHook.create(this.#universe, this.#hook);
    }
}
export class RenderedHook extends RenderedProgramNode {
    static create(universe, hook) {
        return new RenderedHook(universe, hook);
    }
    #hook;
    #universe;
    constructor(universe, hook) {
        super();
        this.#universe = universe;
        this.#hook = hook;
    }
    get metadata() {
        return this.#hook.metadata;
    }
    initialize(_inside) {
        // TODO: Revisit later once we have streaming with sidecar
    }
    poll(inside) {
        LOGGER.trace.group("\npolling RenderedHook", () => {
            let hook = this.#hook.current;
            LOGGER.trace.log(`=> polled`, hook.description);
            LIFETIME.link(this, hook);
            LOGGER.trace.group(`hook.current (getting value of instance of ${hook.description})`, () => {
                HookValue.update(inside, hook.current);
            });
        });
    }
}
//# sourceMappingURL=hook.js.map