import type * as dom from "@domtree/any";
import type { anydom } from "@domtree/flavors";
import type * as minimal from "@domtree/minimal";
import { isPresent } from "../utils/presence.js";
import { Verifier } from "./assert.js";
/**
 * @strip.value node
 *
 * @param node
 * @returns
 */
export declare function mutable<N extends minimal.Node>(node: N): minimal.Mutable<N>;
declare type Tuple<T, N extends number> = N extends N ? number extends N ? T[] : _TupleOf<T, N, []> : never;
declare type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N ? R : _TupleOf<T, N, [T, ...R]>;
declare type ReadonlyTuple<T, N extends number> = N extends N ? number extends N ? readonly T[] : _ReadonlyTupleOf<T, N, readonly []> : never;
declare type _ReadonlyTupleOf<T, N extends number, R extends readonly unknown[]> = R["length"] extends N ? R : _ReadonlyTupleOf<T, N, readonly [T, ...R]>;
export declare type ELEMENT_NODE = 1;
export declare type ATTRIBUTE_NODE = 2;
export declare type TEXT_NODE = 3;
export declare type CDATA_SECTION_NODE = 4;
export declare type PROCESSING_INSTRUCTION_NODE = 7;
export declare type COMMENT_NODE = 8;
export declare type DOCUMENT_NODE = 9;
export declare type DOCUMENT_TYPE_NODE = 10;
export declare type DOCUMENT_FRAGMENT_NODE = 11;
declare type MaybeNode = dom.Node | minimal.Node | null;
declare function isNode(node: MaybeNode): node is minimal.Node;
declare namespace isNode {
    var message: (value: MaybeNode) => "Expected value to be a node, got null" | "Expected value to be a node";
}
declare function isParentNode(node: MaybeNode): node is minimal.ParentNode;
declare function isCharacterData(node: MaybeNode): node is minimal.Text | minimal.Comment;
declare function isTemplateElement(node: MaybeNode): node is minimal.TemplateElement;
export declare function isNullable<In, Out extends In>(verifier: Verifier<In, Out>): Verifier<In | null, Out | null>;
export declare type Primitive = string | number | boolean | symbol | bigint | null | undefined;
export declare function isValue<T extends Primitive>(value: T): Verifier<Primitive, T>;
export declare const is: {
    readonly Node: typeof isNode;
    readonly ParentNode: typeof isParentNode;
    readonly Element: Verifier<MaybeNode, minimal.Element>;
    readonly Text: Verifier<MaybeNode, minimal.Text>;
    readonly Comment: Verifier<MaybeNode, minimal.Comment>;
    readonly CharacterData: typeof isCharacterData;
    readonly Attr: Verifier<MaybeNode, minimal.Attr>;
    readonly TemplateElement: typeof isTemplateElement;
    readonly Present: typeof isPresent;
    readonly nullable: typeof isNullable;
    readonly value: typeof isValue;
};
declare function hasTagName<T extends string>(tagName: T): Verifier<minimal.Element, minimal.Element & {
    readonly tagName: Uppercase<T>;
}>;
declare function hasLength<L extends number>(length: L): {
    <T>(value: T[]): value is Tuple<T, L>;
    <T_1>(value: readonly T_1[]): value is ReadonlyTuple<T_1, L>;
};
declare function hasItems<T>(value: readonly T[]): value is [T, ...(readonly T[])];
interface Typeof {
    string: string;
    boolean: boolean;
    symbol: symbol;
    undefined: undefined;
    object: object | null;
    function: Function;
}
declare function hasTypeof<T extends keyof Typeof>(type: T): Verifier<unknown, Typeof[T]>;
export declare const has: {
    tagName: typeof hasTagName;
    length: typeof hasLength;
    items: typeof hasItems;
    typeof: typeof hasTypeof;
};
/**
 * @strip {value} node
 */
export declare function minimize<N extends anydom.Node | anydom.LiveRange | anydom.StaticRange>(node: N): dom.Minimal<N>;
export {};
