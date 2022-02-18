import { HasMetadata, ReactiveMetadata } from "../core/metadata.js";
export class ReactiveChoice extends HasMetadata {
    value;
    description;
    static create(description, disciminant, value) {
        return new ReactiveChoice(disciminant, value, description);
    }
    // Make ReactiveChoice a nominal class
    #discriminant;
    constructor(discriminant, value, description) {
        super();
        this.value = value;
        this.description = description;
        this.#discriminant = discriminant;
    }
    get discriminant() {
        return this.#discriminant;
    }
    get metadata() {
        return this.value === undefined
            ? ReactiveMetadata.Constant
            : this.value.metadata;
    }
}
const number = (value) => {
    return typeof value === "number";
};
function MakeType() {
    return (value) => true;
}
export class ReactiveCases {
    static define(description, def) {
        return def(new ReactiveCases()).done(description);
    }
    add(_discriminant, _value) {
        return this;
    }
    done(description) {
        function create(discriminant, value) {
            return ReactiveChoice.create(description, discriminant, value);
        }
        return create;
    }
}
//# sourceMappingURL=choice.js.map