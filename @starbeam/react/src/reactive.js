import { useEffect, useMemo, useState } from "react";
import { Abstraction, Cell, Frame, HookBlueprint, lifetime, Memo, Reactive, SimpleHook, } from "starbeam";
class ReactiveComponent {
    static component() {
        return new ReactiveComponent();
    }
    constructor() {
        /** noop */
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
export function useReactive(definition, description = `useReactive ${Abstraction.callerFrame().trimStart()}`) {
    const component = useLifetime();
    const notify = useNotify();
    const frame = useMemo(() => Frame(definition(component), description)
        .subscribe(notify)
        .link(component), []);
    useEffect(() => {
        return () => lifetime.finalize(component);
    }, []);
    return frame.poll();
}
export function starbeam(definition, description = `component ${Abstraction.callerFrame().trimStart()}`) {
    const stableProps = StableProps.empty();
    // const component = ReactiveComponent.component();
    return (props) => {
        const [, setNotify] = useState({});
        const component = useLifetime();
        const reactiveProps = stableProps.update(props);
        const frame = useMemo(() => Frame(definition(reactiveProps, component), description)
            .subscribe(() => setNotify({}))
            .link(component), []);
        useEffect(() => {
            return () => lifetime.finalize(component);
        }, []);
        console.log(frame);
        return frame.poll();
    };
}
function useLifetime() {
    const component = useMemo(() => ReactiveComponent.component(), []);
    useEffect(() => lifetime.finalize(component));
    return component;
}
function useNotify() {
    const [, setNotify] = useState({});
    return useMemo(() => () => setNotify({}), []);
}
class StableProps {
    static empty() {
        return new StableProps(new Map());
    }
    #props;
    constructor(props) {
        this.#props = props;
    }
    #sync(newReactProps) {
        let status = "clean";
        const stableProps = this.#props;
        for (let [key, newValue] of Object.entries(newReactProps)) {
            let cell = stableProps.get(key);
            if (cell) {
                if (cell.current !== newValue) {
                    cell.update(newValue);
                    status = "dirty";
                }
            }
            else {
                stableProps.set(key, Cell(newValue));
            }
        }
        for (let key of stableProps.keys()) {
            if (!(key in newReactProps)) {
                stableProps.delete(key);
                status = "dirty";
            }
        }
        return status;
    }
    update(newReactProps) {
        this.#sync(newReactProps);
        return Object.fromEntries(this.#props.entries());
    }
}
//# sourceMappingURL=reactive.js.map