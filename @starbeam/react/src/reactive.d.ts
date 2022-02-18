import { type ReactElement } from "react";
import { HookBlueprint, Reactive, type AnyRecord } from "starbeam";
declare class ReactiveComponent {
    static component(): ReactiveComponent;
    private constructor();
    readonly on: {
        readonly finalize: (finalizer: () => void) => void;
    };
    use<T>(blueprint: HookBlueprint<T>): Reactive<T>;
    use<T>(callback: (parent: ReactiveComponent) => Reactive<T>): Reactive<T>;
}
export declare function useReactive<T>(definition: (parent: ReactiveComponent) => () => T, description?: string): T;
declare type ReactiveProps<Props extends AnyRecord> = {
    [K in keyof Props]: Reactive<Props[K]>;
};
export declare function starbeam<Props extends AnyRecord>(definition: (props: ReactiveProps<Props>, parent: ReactiveComponent) => () => ReactElement, description?: string): (props: Props) => ReactElement;
export {};
