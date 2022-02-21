import { UNINITIALIZED } from "@starbeam/core";
import { useRef } from "react";
class InstanceState {
    static forInstance(instance) {
        return new InstanceState(instance);
    }
    #instance;
    constructor(instance) {
        this.#instance = instance;
    }
    get instance() {
        return this.#instance;
    }
    update(updater) {
        updater(this.#instance);
        return this.#instance;
    }
}
export function useInstance(initialize) {
    const ref = useRef(UNINITIALIZED);
    let instance;
    if (ref.current === UNINITIALIZED) {
        instance = initialize();
        ref.current = InstanceState.forInstance(instance);
    }
    return ref.current;
}
//# sourceMappingURL=instance.js.map