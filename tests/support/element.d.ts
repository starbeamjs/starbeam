import type { Expects } from "./expect/expect.js";
import { type AttributeName, type BuildAttribute, ContentProgramNode, type IntoReactive, Reactive, type ReactiveElementBuilderCallback, Root } from "starbeam";
interface ShorthandAttribute {
    name: AttributeName;
    value: string | null;
}
declare type TestAttribute = BuildAttribute | ShorthandAttribute | IntoReactive<string | null>;
export declare function isIntoReactive(value: TestAttribute): value is IntoReactive<string | null>;
export declare function isReactiveAttribute(attribute: BuildAttribute | ShorthandAttribute): attribute is BuildAttribute;
export declare type TestChild = ContentProgramNode | string;
export interface TestElementOptions {
    attributes?: Record<string, TestAttribute>;
    children?: readonly TestChild[];
}
export declare class ElementArgs {
    #private;
    readonly universe: Root;
    static normalize(universe: Root, options: TestElementArgs): NormalizedTestElementArgs;
    constructor(universe: Root);
}
export declare function normalizeChild(this: void, universe: Root, child: TestChild): ContentProgramNode;
export declare type BuilderCallback = ReactiveElementBuilderCallback;
export declare type TagName = Reactive<string>;
declare type BuilderElementArgs = [
    tagName: TagName,
    callback: BuilderCallback,
    expectation: Expects
];
declare type ShorthandElementArgs = [
    tagName: IntoReactive<string>,
    options: TestElementOptions,
    expectation: Expects
];
export declare type TestElementArgs = BuilderElementArgs | ShorthandElementArgs;
export declare type NormalizedTestElementArgs = {
    tagName: Reactive<string>;
    build: BuilderCallback;
    expectation: Expects;
};
export {};
//# sourceMappingURL=element.d.ts.map