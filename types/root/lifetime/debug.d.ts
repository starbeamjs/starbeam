import { TreeContent, TreeRecord } from "../../debug/tree.js";
declare type ScalarKeys<T> = {
    [P in keyof T]: T[P] extends Function ? never : P;
}[keyof T];
export declare type JsonOf<T> = {
    [P in keyof T as ScalarKeys<T>]: T[P] extends Function ? never : T[P];
};
export declare class DebugFinalizer {
    #private;
    static create(finalizer: string, token: string): DebugFinalizer;
    private constructor();
    get finalizer(): string;
    get token(): string;
    treeify(): TreeContent;
}
export declare class DebugObjectLifetime {
    #private;
    static create(object: object, finalizers: Set<DebugFinalizer>, children: Set<DebugObjectLifetime>): DebugObjectLifetime;
    private constructor();
    get object(): object;
    get finalizers(): readonly DebugFinalizer[];
    get children(): readonly DebugObjectLifetime[];
    tree(): TreeRecord;
}
export {};
