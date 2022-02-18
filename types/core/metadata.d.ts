import type * as types from "../fundamental/types.js";
export declare abstract class HasMetadata implements types.HasMetadata {
    isConstant(): boolean;
    isDynamic(): boolean;
    abstract get metadata(): ReactiveMetadata;
}
export declare abstract class ReactiveMetadata implements types.ReactiveMetadata {
    static get Constant(): ConstantMetadata;
    static get Dynamic(): DynamicMetadata;
    static all(...reactive: types.HasMetadata[]): types.ReactiveMetadata;
    abstract kind: "constant" | "dynamic";
    isConstant(this: types.ReactiveMetadata): this is ConstantMetadata;
    isDynamic(this: types.ReactiveMetadata): this is DynamicMetadata;
    describe(): string;
}
export declare class ConstantMetadata extends ReactiveMetadata implements types.ConstantMetadata {
    readonly kind = "constant";
}
export declare class DynamicMetadata extends ReactiveMetadata implements types.DynamicMetadata {
    readonly kind = "dynamic";
}
