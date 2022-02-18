import type * as types from "../fundamental/types.js";

export abstract class HasMetadata implements types.HasMetadata {
  isConstant(): boolean {
    return this.metadata.isConstant();
  }

  isDynamic(): boolean {
    return this.metadata.isDynamic();
  }

  abstract get metadata(): ReactiveMetadata;
}

export abstract class ReactiveMetadata implements types.ReactiveMetadata {
  static get Constant(): ConstantMetadata {
    return CONSTANT;
  }

  static get Dynamic(): DynamicMetadata {
    return DYNAMIC;
  }

  static all(...reactive: types.HasMetadata[]): types.ReactiveMetadata {
    return reactive.every((r) => r.metadata.isConstant()) ? CONSTANT : DYNAMIC;
  }

  abstract kind: "constant" | "dynamic";

  isConstant(this: types.ReactiveMetadata): this is ConstantMetadata {
    return this === CONSTANT;
  }

  isDynamic(this: types.ReactiveMetadata): this is DynamicMetadata {
    return this === DYNAMIC;
  }

  describe(): string {
    return this.kind;
  }
}

export class ConstantMetadata
  extends ReactiveMetadata
  implements types.ConstantMetadata
{
  readonly kind = "constant";
}

const CONSTANT = new ConstantMetadata();

export class DynamicMetadata
  extends ReactiveMetadata
  implements types.DynamicMetadata
{
  readonly kind = "dynamic";
}

const DYNAMIC = new DynamicMetadata();
