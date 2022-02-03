export abstract class HasMetadata {
  isConstant(): boolean {
    return this.metadata.isConstant();
  }

  isDynamic(): boolean {
    return this.metadata.isDynamic();
  }

  abstract get metadata(): ReactiveMetadata;
}

export abstract class ReactiveMetadata {
  static get Constant(): ConstantMetadata {
    return CONSTANT;
  }

  static get Dynamic(): DynamicMetadata {
    return DYNAMIC;
  }

  static all(...reactive: HasMetadata[]): ReactiveMetadata {
    return reactive.every((r) => r.metadata.isConstant()) ? CONSTANT : DYNAMIC;
  }

  isConstant(this: ReactiveMetadata): this is ConstantMetadata {
    return this === CONSTANT;
  }

  isDynamic(this: ReactiveMetadata): this is DynamicMetadata {
    return this === DYNAMIC;
  }

  describe(): string {
    return this.kind;
  }
}

export interface ReactiveMetadata {
  readonly kind: "constant" | "dynamic";
}

export class ConstantMetadata extends ReactiveMetadata {
  readonly kind = "constant";
}

const CONSTANT = new ConstantMetadata();

export class DynamicMetadata extends ReactiveMetadata {
  readonly kind = "dynamic";
}

const DYNAMIC = new DynamicMetadata();

// export enum ReactiveMetadata {
//   /**
//    * This data can't change anymore
//    */
//   Constant,
//   /**
//    * This data might change again, or wasn't yet initialized
//    */
//   Dynamic,
// }

export interface WithReactiveMetadata {
  readonly metadata: ReactiveMetadata;
}
