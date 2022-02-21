declare class InstanceState<T> {
    #private;
    static forInstance<T>(instance: T): InstanceState<T>;
    private constructor();
    get instance(): T;
    update(updater: (instance: T) => void): T;
}
export interface NormalizedUseInstanceOptions<T> {
    readonly initial: (notify: () => void) => T;
    readonly update?: (value: T, notify: () => void) => void;
    readonly finalize?: (value: T) => void;
}
export declare type UseInstanceArg<T> = () => T;
export declare function useInstance<T>(initialize: () => T): InstanceState<T>;
export {};
//# sourceMappingURL=instance.d.ts.map