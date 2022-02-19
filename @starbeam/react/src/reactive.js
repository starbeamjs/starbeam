import { useEffect, useLayoutEffect, useRef, useState, } from "react";
import { Abstraction, Cell, HookBlueprint, lifetime, Memo, Reactive, SimpleHook, subscribe, UNINITIALIZED, } from "starbeam";
import { useInstance } from "./instance.js";
export class ReactiveComponent {
    static create(notify) {
        return new ReactiveComponent(notify);
    }
    #updatedNotify = 0;
    #notify;
    constructor(notify) {
        this.#notify = notify;
    }
    get notify() {
        return () => {
            this.#notify();
        };
    }
    updateNotify(notify) {
        this.#notify = notify;
    }
    useComponentManager(manager, props) {
        let instance = useInstance(this, () => {
            return manager.create(this, props);
        }).update({
            finalize: true,
            update: (instance) => {
                manager.update(instance, props);
            },
        });
        return instance;
    }
    on = {
        finalize: (finalizer) => lifetime.on.finalize(this, finalizer),
    };
    use(blueprint) {
        let normalized = typeof blueprint === "function"
            ? HookBlueprint.create(() => blueprint(this), `(anonymous hook from useReactive)`)
            : blueprint;
        let hook = SimpleHook.construct(normalized);
        lifetime.link(this, hook);
        // however, we need to *avoid* adding the dependencies of the hook's
        // returned reactive to the parent hook constructor *or* this hook
        // constructor.
        return Memo(() => hook.current.current, `memo for: ${normalized.description} instance`);
    }
}
export function starbeam(definition, description = `component ${Abstraction.callerFrame().trimStart()}`) {
    return (props) => {
        const component = useStableComponent();
        const stableProps = component.useComponentManager(STABLE_COMPONENT, props);
        let subscription = useInstance(component, () => subscribe(Memo(definition(stableProps.reactive, component)), component.notify, description)).instance;
        // idempotent
        lifetime.link(component, subscription);
        return subscription.poll().value;
    };
}
class StableComponent {
    create(component, props) {
        return StableProps.from(props);
    }
    update(instance, props) {
        instance.update(props);
    }
}
const STABLE_COMPONENT = new StableComponent();
function useStableComponent() {
    const ref = useRef(UNINITIALIZED);
    const isFirstTime = ref.current === UNINITIALIZED;
    const [, setNotify] = useState({});
    if (ref.current === UNINITIALIZED) {
        ref.current = ReactiveComponent.create(() => setNotify({}));
    }
    let instance = ref.current;
    useEffect(() => {
        if (isFirstTime) {
            return () => lifetime.finalize(instance);
        }
        return;
    }, []);
    useLayoutEffect(() => {
        instance.updateNotify(() => setNotify({}));
    });
    return ref.current;
}
export class StableProps {
    static from(props) {
        let reactive = Object.fromEntries(Object.entries(props).map(([key, value]) => [key, Cell(value)]));
        return new StableProps(reactive);
    }
    #reactive;
    constructor(reactive) {
        this.#reactive = reactive;
    }
    #sync(newReactProps) {
        let status = "clean";
        const stableProps = this.#reactive;
        for (let [key, newValue] of Object.entries(newReactProps)) {
            let cell = stableProps[key];
            if (cell) {
                if (cell.current !== newValue) {
                    cell.update(newValue);
                    status = "dirty";
                }
            }
            else {
                stableProps[key] = Cell(newValue);
            }
        }
        for (let key of Object.keys(stableProps)) {
            if (!(key in newReactProps)) {
                delete stableProps[key];
                status = "dirty";
            }
        }
        return status;
    }
    update(newReactProps) {
        this.#sync(newReactProps);
    }
    get reactive() {
        return this.#reactive;
    }
}
//# sourceMappingURL=reactive.js.map