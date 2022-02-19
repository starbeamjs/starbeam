import { useRef } from "react";
import { isObject, lifetime, UNINITIALIZED } from "starbeam";
function normalizeUpdate(component, instance, options) {
    const { finalize, update } = options;
    if (finalize && isObject(instance)) {
        lifetime.link(component, instance);
        if (typeof finalize === "function") {
            lifetime.on.finalize(instance, () => finalize(instance));
        }
    }
    return update ? (instance) => update(instance, component.notify) : undefined;
}
class InstanceState {
    static forInstance(component, instance) {
        return new InstanceState(component, instance);
    }
    static getUpdater(state) {
        return state.#updater;
    }
    #component;
    #instance;
    #updater;
    constructor(component, instance) {
        this.#component = component;
        this.#instance = instance;
    }
    get instance() {
        return this.#instance;
    }
    update(options) {
        if (this.#updater) {
            return this.#instance;
        }
        this.#updater = normalizeUpdate(this.#component, this.#instance, options);
        return this.#instance;
    }
}
export function useInstance(component, initialize) {
    const ref = useRef(UNINITIALIZED);
    let instance;
    if (ref.current === UNINITIALIZED) {
        instance = initialize(component.notify);
        ref.current = InstanceState.forInstance(component, instance);
    }
    else {
        let state = ref.current;
        instance = state.instance;
        let updater = InstanceState.getUpdater(state);
        if (updater) {
            updater(instance);
        }
    }
    return ref.current;
}
//# sourceMappingURL=instance.js.map