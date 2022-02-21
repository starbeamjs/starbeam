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
export declare type ReactiveProps<Props> = {
    [K in keyof Props]: K extends `$${string}` | `children` ? Props[K] : Reactive<Props[K]>;
};
declare type ReactProps<Props> = {
    [K in keyof Props]: K extends `children` | `$${string}` ? Props[K] : Props[K] extends Reactive<infer T> ? T | Reactive<T> : never;
};
declare type InternalReactiveProps<Props extends AnyRecord> = {
    [K in keyof Props]: K extends `children` | `$${string}` ? Props[K] : Cell<Props[K]>;
};
export declare function Component<Props>(definition: (props: Props, parent: ReactiveComponent) => () => ReactElement, description?: string): (props: ReactProps<Props>) => ReactElement;
interface ComponentManager<Props, Instance extends object> {
    create(component: ReactiveComponent, props: Props): Instance;
    update(instance: Instance, props: Props): void;
}
declare class StableComponent<Props> implements ComponentManager<Props, StableProps<Props>> {
    create<P extends Props>(component: ReactiveComponent, props: P): StableProps<P>;
    update<P extends Props>(instance: StableProps<P>, props: P): void;
}
export declare const STABLE_COMPONENT: StableComponent<unknown>;
export declare function useStableComponent(): ReactiveComponent;
export declare class StableProps<Props> {
    #private;
    static from<Props>(props: Props): StableProps<Props>;
    constructor(reactive: InternalReactiveProps<Props>);
    update(newReactProps: AnyRecord): void;
    get reactive(): ReactiveProps<Props>;
}
export {};
//# sourceMappingURL=component.d.ts.map