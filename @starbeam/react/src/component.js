import { assert, Cell, exhaustive, expected, getDescription, HookBlueprint, is, lifetime, LOGGER, Memo, Reactive, SimpleHook, subscribe, verify, } from "@starbeam/core";
import { useCallback, useDebugValue, useState } from "react";
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
export function Component(definition, description = getDescription(definition)) {
    const component = (props) => {
        useDebugValue(description);
        const component = useStableComponent();
        LOGGER.trace.log({
            in: "Component#parent",
            component,
            notify: component.notify,
        });
        const stableProps = component.useComponentManager(STABLE_COMPONENT, props);
        let subscription = useInstance(() => subscribe(Memo(definition(stableProps.reactive, component)), component.notify, description)).instance;
        // idempotent
        lifetime.link(component, subscription);
        return subscription.poll().value;
    };
    Object.defineProperty(component, "displayName", {
        enumerable: true,
        writable: false,
        configurable: true,
        value: description,
    });
    return component;
}
class StableComponent {
    create(component, props) {
        return StableProps.from(props);
    }
    update(instance, props) {
        instance.update(props);
    }
}
export const STABLE_COMPONENT = new StableComponent();
export function useStableComponent() {
    const component = useInstance(() => ReactiveComponent.create(() => null)).instance;
    const [, setNotify] = useState({});
    const notify = useCallback(() => setNotify({}), [setNotify]);
    component.updateNotify(notify);
    return component;
}
export class StableProps {
    static from(props) {
        let reactive = Object.fromEntries(Object.entries(props).map(([key, value]) => initialPropEntry(key, value)));
        return new StableProps(reactive);
    }
    #reactive;
    constructor(reactive) {
        this.#reactive = reactive;
    }
    #sync(newReactProps) {
        const stableProps = this.#reactive;
        for (let [key, newValue] of Object.entries(newReactProps)) {
            updateProp(stableProps, key, newValue);
        }
        for (let key of Object.keys(stableProps)) {
            if (!(key in newReactProps)) {
                delete stableProps[key];
            }
        }
    }
    update(newReactProps) {
        this.#sync(newReactProps);
    }
    get reactive() {
        return this.#reactive;
    }
}
// TODO: `$`-prefixed props should be stable and a change to `children`
// should result in a re-render. But we may not want to require
// useCallback... probably?
function isPassthruProp(key) {
    verify(key, is((value) => typeof value === "string" || typeof value === "symbol"));
    if (typeof key === "symbol") {
        return true;
    }
    else if (typeof key === "string") {
        return key.startsWith("$") || key === "children";
    }
    else {
        exhaustive(key);
    }
}
function initialPropEntry(key, value) {
    if (isPassthruProp(key)) {
        return [key, value];
    }
    else if (Reactive.is(value)) {
        return [key, value];
    }
    else {
        return [key, Cell(value)];
    }
}
// TODO: `$`-prefixed props should be stable and a change to `children`
// should result in a re-render. But we may not want to require
// useCallback... probably?
function updateProp(props, key, newValue) {
    if (isPassthruProp(key)) {
        props[key] = newValue;
    }
    else if (key in props) {
        const existing = props[key];
        if (Reactive.is(newValue)) {
            assert(existing === newValue, "When passing a reactive value to a Starbeam component, you must pass the same Reactive every time");
            return;
        }
        verify(existing, is(Cell.is), expected(`an existing reactive prop`)
            .toBe(`a cell`)
            .when(`a prop isn't 'children', prefixed with '$' or a symbol`));
        const existingValue = existing.current;
        if (existingValue !== newValue) {
            existing.update(newValue);
        }
    }
    else {
        props[key] = Cell(newValue);
    }
}
//# sourceMappingURL=component.js.map