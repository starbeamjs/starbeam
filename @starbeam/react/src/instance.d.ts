import type { ReactiveComponent } from "./reactive.js";
export interface UpdateOptions<T> {
    update?: (instance: T, notify: () => void) => void;
    finalize?: true | ((instance: T) => void) | (() => void);
}
declare type UpdateCallback<T> = (instance: T) => void;
export interface UseInstanceOptions<T> {
    (notify: () => void): UpdateOptions<T>;
}
declare class InstanceState<T> {
    #private;
    static forInstance<T>(component: ReactiveComponent, instance: T): InstanceState<T>;
    static getUpdater<T>(state: InstanceState<T>): UpdateCallback<T> | undefined;
    private constructor();
    get instance(): T;
    update(options: UpdateOptions<T>): T;
}
export interface NormalizedUseInstanceOptions<T> {
    readonly initial: (notify: () => void) => T;
    readonly update?: (value: T, notify: () => void) => void;
    readonly finalize?: (value: T) => void;
}
export declare type UseInstanceArg<T> = (() => T) | UseInstanceOptions<T>;
export declare function useInstance<T>(component: ReactiveComponent, initialize: (notify: () => void) => T): InstanceState<T>;
export {};
