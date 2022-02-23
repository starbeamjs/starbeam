import type {
  ConstantMetadata as ConstantMetadataType,
  DynamicMetadata as DynamicMetadataType,
  HasMetadata as HasMetadataType,
  ReactiveMetadata as ReactiveMetadataType,
} from "../fundamental/types.js";

export abstract class HasMetadata implements HasMetadataType {
  isConstant(): boolean {
    return this.metadata.isConstant();
  }

  isDynamic(): boolean {
    return this.metadata.isDynamic();
  }

  abstract get metadata(): ReactiveMetadata;
}

export abstract class ReactiveMetadata implements ReactiveMetadataType {
  static get Constant(): ConstantMetadata {
    return CONSTANT;
  }

  static get Dynamic(): DynamicMetadata {
    return DYNAMIC;
  }

  static all(...reactive: HasMetadataType[]): ReactiveMetadataType {
    return reactive.every((r) => r.metadata.isConstant()) ? CONSTANT : DYNAMIC;
  }

  abstract kind: "constant" | "dynamic";

  isConstant(this: ReactiveMetadataType): this is ConstantMetadata {
    return this === CONSTANT;
  }

  isDynamic(this: ReactiveMetadataType): this is DynamicMetadata {
    return this === DYNAMIC;
  }

  describe(): string {
    return this.kind;
  }
}

export class ConstantMetadata
  extends ReactiveMetadata
  implements ConstantMetadataType
{
  readonly kind = "constant";
}

const CONSTANT = new ConstantMetadata();

export class DynamicMetadata
  extends ReactiveMetadata
  implements DynamicMetadataType
{
  readonly kind = "dynamic";
}

const DYNAMIC = new DynamicMetadata();
