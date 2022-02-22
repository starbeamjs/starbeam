import type { ConstantMetadata as ConstantMetadataType, DynamicMetadata as DynamicMetadataType, HasMetadata as HasMetadataType, ReactiveMetadata as ReactiveMetadataType } from "../fundamental/types.js";
export declare abstract class HasMetadata implements HasMetadataType {
    isConstant(): boolean;
    isDynamic(): boolean;
    abstract get metadata(): ReactiveMetadata;
}
export declare abstract class ReactiveMetadata implements ReactiveMetadataType {
    static get Constant(): ConstantMetadata;
    static get Dynamic(): DynamicMetadata;
    static all(...reactive: HasMetadataType[]): ReactiveMetadataType;
    abstract kind: "constant" | "dynamic";
    isConstant(this: ReactiveMetadataType): this is ConstantMetadata;
    isDynamic(this: ReactiveMetadataType): this is DynamicMetadata;
    describe(): string;
}
export declare class ConstantMetadata extends ReactiveMetadata implements ConstantMetadataType {
    readonly kind = "constant";
}
export declare class DynamicMetadata extends ReactiveMetadata implements DynamicMetadataType {
    readonly kind = "dynamic";
}
//# sourceMappingURL=metadata.d.ts.map