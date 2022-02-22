import { QualifiedName } from "@starbeam/core";
import type { Buffer, Serialize, SerializeOptions } from "./body.js";
export declare abstract class HtmlAttribute implements Serialize {
    static is(this: typeof HtmlAttribute, value: unknown): value is HtmlAttribute;
    static is<T extends HtmlAttribute>(this: {
        create(...args: any[]): T;
    } & Function, value: unknown): value is T;
    static class(initial: string | null): HtmlAttribute;
    static concat(name: QualifiedName, initial: string | null, separator: string): HtmlAttribute;
    static default(name: QualifiedName, initial: string | null): HtmlAttribute;
    abstract merge(newValue: this | string | null): void;
    abstract serializeInto(buffer: Buffer, options?: SerializeOptions): void;
}
export interface HtmlAttribute {
    readonly name: QualifiedName;
}
export declare class ConcatAttribute extends HtmlAttribute {
    #private;
    readonly name: QualifiedName;
    static class(initial: string | null): ConcatAttribute;
    static create(name: QualifiedName, initial: string | null, separator: string): ConcatAttribute;
    private constructor();
    serializeInto(buffer: Buffer, { prefix }: SerializeOptions): void;
    merge(newValue: this | string | null): void;
}
export declare class ClobberAttribute extends HtmlAttribute {
    #private;
    readonly name: QualifiedName;
    static create(name: QualifiedName, value: string | null): ClobberAttribute;
    protected constructor(name: QualifiedName, value: string | null);
    serializeInto(buffer: Buffer, options: SerializeOptions): void;
    get value(): string | null;
    merge(newValue: this | string | null): void;
}
export declare class IdempotentAttribute extends HtmlAttribute {
    #private;
    readonly name: QualifiedName;
    static create(name: QualifiedName, value: string | null): IdempotentAttribute;
    private constructor();
    merge(newValue: this | string | null): void;
    serializeInto(buffer: Buffer, options?: SerializeOptions): void;
}
export declare class AttributesBuffer implements Serialize {
    #private;
    static empty(): AttributesBuffer;
    initialize(attr: HtmlAttribute): void;
    merge(name: QualifiedName, value: string | null): void;
    idempotent(attr: HtmlAttribute): this;
    serializeInto(buffer: Buffer, options?: SerializeOptions): void;
}
export declare type AttrType = "default" | "clobber" | "idempotent" | [type: "concat", separator: string];
export declare function attrFor(name: QualifiedName, value: string | null, type: AttrType): HtmlAttribute;
export declare type Attributes = ReadonlyMap<string, string | null | AttributeValue>;
export interface AttributeValue {
    readonly value: string | null;
    readonly type?: AttrType;
}
//# sourceMappingURL=attribute.d.ts.map