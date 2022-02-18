/**
 * Everything in this file is, in principle, strippable.
 */
/**
 * The strippable usage pattern is:
 *
 * ```ts
 * let name = QualifiedName("xlink:actuate");
 * console.log(Wrapper.getInner(name));
 * ```
 *
 * which is stripped to:
 *
 * ```ts
 * let name = "xlink:actuate";
 * console.log(name);
 * ```
 *
 * If you want to run code that is explicitly for debug-mode only, then you can
 * use this usage pattern:
 *
 * ```ts
 * let person = Wrapper.withMeta({ name: "Tom" }, { description: "Person" });
 * Wrapper.inDebug(person, (person, meta) => {
 *   console.group(meta.description);
 *   console.log(`%cName:%c ${person.name}`, "color: red", "color: black");
 *   console.groupEnd();
 * })
 * ```
 *
 * Which gets stripped to:
 *
 * ```ts
 * let person = { name: "Tom" };
 * ```
 */
export declare class Wrapper<T, Meta, S extends symbol> {
    #private;
    static of<T, S extends symbol>(value: T, symbol: S): Wrapper<T, null, S>;
    static withMeta<T, S extends symbol, Meta>(value: T, meta: Meta, symbol: S): Wrapper<T, Meta, S>;
    /**
     * @strip.value newtype
     */
    static getInner<T>(newtype: AnyWrapper<T>): T;
    /**
     * @strip.noop
     */
    static inDebug<T, Meta>(newtype: AnyWrapper<T, Meta>, callback: (value: T, meta: Meta) => void): void;
    private constructor();
}
/**
 * Use this type to force TypeScript to accept the inferred function body's
 * return type as compatible with the function's signature.
 *
 * In general, this is necessary when the signature uses generics and mapped
 * types, but the function body uses `unknown` (because the generics are not
 * reified as a runtime concept in TypeScript).
 */
export declare type InferReturn = any;
/**
 * Use this type to force TypeScript to accept an argument as compatible with
 * the function's signature. return type as compatible with the signature of a
 * function it is used inside of.
 *
 * In general, this is necessary when the signature uses generics and mapped
 * types, but the function body uses `unknown` (because the generics are not
 * reified as a runtime concept in TypeScript).
 */
export declare type InferArgument = any;
export declare type UnsafeAny = any;
export declare type AnyKey = keyof any;
export declare type AnyRecord<V = any> = {
    [P in keyof any]: V;
};
export declare type AnyDict = {
    [P in keyof any as Extract<P, string>]: any;
};
export declare type AnyWrapper<T, Meta = unknown> = Wrapper<T, Meta, UnsafeAny>;
export interface OpaqueMetadata {
    description: string;
}
/**
 * An opaque alias is a simple wrapper around a value that exists (in this
 * codebase) purely to distinguish different variants of the same underlying
 * type (like localName vs. qualifiedName).
 */
export declare type OpaqueAlias<T, S extends symbol> = Wrapper<T, OpaqueMetadata, S>;
export declare type OpaqueValue<O extends OpaqueAlias<unknown, symbol>> = O extends OpaqueAlias<infer T, symbol> ? T : never;
declare const QUALIFIED_NAME: unique symbol;
export declare type QualifiedName = OpaqueAlias<string, typeof QUALIFIED_NAME>;
/**
 * @strip.value name
 */
export declare function QualifiedName(name: string): QualifiedName;
declare const LOCAL_NAME: unique symbol;
export declare type LocalName = OpaqueAlias<string, typeof LOCAL_NAME>;
/**
 * @strip.value name
 */
export declare function LocalName(name: string): LocalName;
export {};
