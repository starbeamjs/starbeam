export class HasMetadata {
    isConstant() {
        return this.metadata.isConstant();
    }
    isDynamic() {
        return this.metadata.isDynamic();
    }
}
export class ReactiveMetadata {
    static get Constant() {
        return CONSTANT;
    }
    static get Dynamic() {
        return DYNAMIC;
    }
    static all(...reactive) {
        return reactive.every((r) => r.metadata.isConstant()) ? CONSTANT : DYNAMIC;
    }
    isConstant() {
        return this === CONSTANT;
    }
    isDynamic() {
        return this === DYNAMIC;
    }
    describe() {
        return this.kind;
    }
}
export class ConstantMetadata extends ReactiveMetadata {
    kind = "constant";
}
const CONSTANT = new ConstantMetadata();
export class DynamicMetadata extends ReactiveMetadata {
    kind = "dynamic";
}
const DYNAMIC = new DynamicMetadata();
//# sourceMappingURL=metadata.js.map