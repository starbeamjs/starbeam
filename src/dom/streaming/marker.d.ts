import type { minimal } from "@domtree/flavors";
import type { ContentBuffer, ElementHeadBuffer } from "../buffer/body.js";
import type { DomEnvironment } from "../environment.js";
import { ContentRange } from "./compatible-dom.js";
import { Token } from "./token.js";
export declare const COMMENT: {};
export declare const SINGLE_ELEMENT: {
    start(output: string[], token: Token): void;
};
export declare type ElementContext = "html" | "mathml" | "svg";
export interface BodyTransform {
    <B extends ContentBuffer>(buffer: B): B;
}
export declare function Body(callback: <B extends ContentBuffer>(buffer: B) => B): BodyTransform;
export interface ElementTransform {
    <B extends ElementHeadBuffer>(buffer: B): void;
}
export declare function Element(callback: <B extends ElementHeadBuffer>(buffer: B) => void): ElementTransform;
interface AbstractHydration<Out> {
    hydrate(environment: DomEnvironment, container: minimal.ParentNode, token: Token): Out;
}
export declare type Hydration<Out = unknown> = AbstractHydration<Out>;
interface AbstractMarker<Buffer> {
    <B extends Buffer>(buffer: B, token: Token, body?: (buffer: B) => B): B;
}
export declare type Marker<Buffer = unknown, Out = unknown> = {
    readonly mark: AbstractMarker<Buffer>;
    readonly hydrator: AbstractHydration<Out>;
};
export declare class AttributeMarker implements AbstractHydration<minimal.Attr> {
    forName(qualifiedName: string): Marker<ElementHeadBuffer>;
    hydrate(environment: DomEnvironment, container: minimal.ParentNode, token: Token): minimal.Attr;
}
export declare const ATTRIBUTE_MARKER: AttributeMarker;
export declare class ElementMarker implements AbstractHydration<minimal.Element> {
    readonly marker: Marker<ElementHeadBuffer, minimal.Element>;
    hydrate(environment: DomEnvironment, container: minimal.ParentNode, token: Token): minimal.Element;
}
export declare const ELEMENT_MARKER: Marker<ElementHeadBuffer, minimal.Element>;
declare abstract class RangeMarker<Out> implements AbstractHydration<Out> {
    readonly marker: Marker<ContentBuffer>;
    abstract hydrate(environment: DomEnvironment, container: minimal.ParentNode, token: Token): Out;
}
export declare class CharacterDataMarker extends RangeMarker<minimal.ReadonlyCharacterData> {
    hydrate(environment: DomEnvironment, container: minimal.ParentNode, token: Token): minimal.ReadonlyCharacterData;
}
export declare const CHARACTER_DATA_MARKER: Marker<ContentBuffer, unknown>;
export declare class ContentRangeMarker extends RangeMarker<ContentRange> {
    hydrate(environment: DomEnvironment, container: minimal.ParentNode, token: Token): ContentRange;
}
export declare const CONTENT_RANGE_MARKER: Marker<ContentBuffer, unknown>;
export declare function attrSelector(attr: string, value?: string): string;
export declare function findElement(container: minimal.ParentNode, selector: string): minimal.Element;
export declare function findElements(container: minimal.ParentNode, selector: string): IterableIterator<minimal.ChildNode>;
export {};
//# sourceMappingURL=marker.d.ts.map