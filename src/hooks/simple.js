import { LIFETIME } from "../core/lifetime/lifetime.js";
import { UNINITIALIZED } from "../fundamental/constants.js";
import { ExtendsReactive } from "../reactive/base.js";
import { ReactiveMemo } from "../reactive/memo.js";
import { verified } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
import { LOGGER } from "../strippable/trace.js";
import { expected } from "../strippable/verify-context.js";
/**
 * This class wraps the HookConstructor callback to give it extra debug
 * information. It is returned by universe.hook.
 */
export class HookBlueprint {
    construct;
    description;
    static create(construct, description) {
        return new HookBlueprint(construct, description);
    }
    constructor(construct, description) {
        this.construct = construct;
        this.description = description;
    }
    asData() {
        let hook = SimpleHook.construct(this);
        // however, we need to *avoid* adding the dependencies of the hook's
        // returned reactive to the parent hook constructor *or* this hook
        // constructor.
        return ReactiveMemo.create(() => hook.current.current, `memo for: ${this.description} instance`);
    }
}
export class SimpleHook extends ExtendsReactive {
    static #ids = 0;
    static create(reactive, description) {
        return new SimpleHook(reactive, false, description);
    }
    static construct(blueprint) {
        let last = null;
        // Return a memo that will always return a hook. If the memo invalidates, it
        // will automatically finalize the last hook and construct a new hook by
        // invoking the blueprint again.
        return ReactiveMemo.create(() => {
            if (last) {
                LIFETIME.finalize(last);
            }
            // First, construct a new hook that doesn't yet have its reactive value
            // filled in, but is ready to be used to invoke a blueprint.
            last = SimpleHook.create(null, blueprint.description);
            // Then, construct the blueprint by invoking its callback. This will
            // collect its top-level dependencies into the memo and produce the
            // reactive value returned by the blueprint. Assign the reactive value to
            // the hook.
            last.#reactive = blueprint.construct(last);
            // Return the hook.
            return last;
        }, `constructor for: ${blueprint.description}`);
    }
    #description;
    #id;
    #reactive;
    #isResource;
    constructor(reactive, isResource, description) {
        super({
            name: "Hook",
            description,
        });
        LIFETIME.on.finalize(this, () => LOGGER.trace.log(`destroying instance of ${description}`));
        this.#reactive = reactive;
        this.#description = description;
        this.#isResource = isResource;
        this.#id = ++SimpleHook.#ids;
    }
    get cells() {
        if (this.#reactive) {
            return this.#reactive.cells;
        }
        else {
            return UNINITIALIZED;
        }
    }
    get metadata() {
        return this.#presentReactive.metadata;
    }
    get description() {
        return `${this.#description} (id = ${this.#id})`;
    }
    onDestroy(finalizer) {
        this.#isResource = true;
        LIFETIME.on.finalize(this, finalizer);
    }
    use(blueprint) {
        let hook = SimpleHook.construct(blueprint);
        // however, we need to *avoid* adding the dependencies of the hook's
        // returned reactive to the parent hook constructor *or* this hook
        // constructor.
        return ReactiveMemo.create(() => hook.current.current, `memo for: ${blueprint.description} instance`);
    }
    get #presentReactive() {
        return verified(this.#reactive, is.Present, expected(`a hook's reactive`)
            .toBe(`present`)
            .when(`its current property is exposed to user code`));
    }
    get current() {
        return this.#presentReactive.current;
    }
    poll() {
        this.current;
    }
}
//# sourceMappingURL=simple.js.map