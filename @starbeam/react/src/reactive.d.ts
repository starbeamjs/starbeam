import { type ReactElement } from "react";
import { Cell, HookBlueprint, Reactive, type AnyRecord } from "starbeam";
export declare class ReactiveComponent {
    #private;
    static create(notify: () => void): ReactiveComponent;
    private constructor();
    get notify(): () => void;
    updateNotify(notify: () => void): void;
    useComponentManager<Props, C extends ComponentManager<unknown, object>>(manager: C, props: Props): C extends ComponentManager<Props, infer Instance> ? Instance : never;
    readonly on: {
        readonly finalize: (finalizer: () => void) => void;
    };
    use<T>(blueprint: HookBlueprint<T>): Reactive<T>;
    use<T>(callback: (parent: ReactiveComponent) => Reactive<T>): Reactive<T>;
}
declare type ReactiveProps<Props extends AnyRecord> = {
    [K in keyof Props]: Reactive<Props[K]>;
};
declare type InternalReactiveProps<Props extends AnyRecord> = {
    [K in keyof Props]: Cell<Props[K]>;
};
export declare function starbeam<Props extends AnyRecord>(definition: (props: ReactiveProps<Props>, parent: ReactiveComponent) => () => ReactElement, description?: string): (props: Props) => ReactElement;
interface ComponentManager<Props, Instance extends object> {
    create(component: ReactiveComponent, props: Props): Instance;
    update(instance: Instance, props: Props): void;
}
export declare class StableProps<Props> {
    #private;
    static from<Props>(props: Props): StableProps<Props>;
    constructor(reactive: InternalReactiveProps<Props>);
    update(newReactProps: AnyRecord): void;
    get reactive(): ReactiveProps<Props>;
}
export {};
