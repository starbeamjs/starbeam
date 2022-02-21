import { useCallback, useDebugValue, useState } from "react";
import { Abstraction, Cell, HookBlueprint, lifetime, Memo, Reactive, SimpleHook, subscribe, } from "starbeam";
import { useInstance } from "./instance.js";
export class ReactiveComponent {
    static create(notify) {
        return new ReactiveComponent(notify);
    }
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
        let instance = useInstance(() => {
            return manager.create(this, props);
        }).update((instance) => manager.update(instance, props));
        lifetime.link(this, instance);
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
export function Component(definition, description = `component ${Abstraction.callerFrame().trimStart()}`) {
    return (props) => {
        useDebugValue(description);
        const component = useStableComponent();
        console.log({ in: "parent", component, notify: component.notify });
        const stableProps = component.useComponentManager(STABLE_COMPONENT, props);
        let subscription = useInstance(() => subscribe(Memo(definition(stableProps.reactive, component)), component.notify, description)).instance;
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
    const component = useInstance(() => ReactiveComponent.create(() => null)).instance;
    const [, setNotify] = useState({});
    const notify = useCallback(() => setNotify({}), [setNotify]);
    component.updateNotify(notify);
    return component;
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