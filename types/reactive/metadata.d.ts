export declare abstract class HasMetadata {
    isConstant(): boolean;
    isDynamic(): boolean;
    abstract get metadata(): ReactiveMetadata;
}
export declare abstract class ReactiveMetadata {
    static get Constant(): ConstantMetadata;
    static get Dynamic(): DynamicMetadata;
    static all(...reactive: HasMetadata[]): ReactiveMetadata;
    isConstant(this: ReactiveMetadata): this is ConstantMetadata;
    isDynamic(this: ReactiveMetadata): this is DynamicMetadata;
    describe(): string;
}
export interface ReactiveMetadata {
    readonly kind: "constant" | "dynamic";
}
export declare class ConstantMetadata extends ReactiveMetadata {
    readonly kind = "constant";
}
export declare class DynamicMetadata extends ReactiveMetadata {
    readonly kind = "dynamic";
}
export interface WithReactiveMetadata {
    readonly metadata: ReactiveMetadata;
}
