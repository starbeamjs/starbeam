import type { minimal } from "@domtree/flavors";
import { JSDOM } from "jsdom";
import { CommentProgramNode, ContentProgramNode, ElementProgramNode, FragmentProgramNode, Reactive, ReactiveDOM, ReactiveMetadata, RenderedRoot, TextProgramNode, Root, Cell } from "starbeam";
import { type TestChild, type TestElementArgs } from "./element.js";
import { Expects } from "./expect/expect.js";
export interface TestArgs {
    readonly universe: Root;
    readonly test: TestSupport;
    readonly dom: ReactiveDOM;
}
export declare function test(name: string, test: (args: TestArgs) => void | Promise<void>): void;
export declare function todo(name: string, test?: (args: TestArgs) => void | Promise<void>): void;
export declare class TestRoot {
    #private;
    static create(root: RenderedRoot<minimal.ParentNode>, container: minimal.Element): TestRoot;
    private constructor();
    poll(): void;
    update<T>([cell, value]: [cell: Cell<T>, value: T], expectation: Expects): this;
    update(updater: () => void, expectation: Expects): this;
}
export declare class TestSupport {
    #private;
    static create(jsdom?: JSDOM): TestSupport;
    readonly universe: Root;
    readonly dom: ReactiveDOM;
    private constructor();
    buildText(reactive: Reactive<string>, expectation: ReactiveMetadata): TextProgramNode;
    buildComment(reactive: Reactive<string>, expectation: ReactiveMetadata): CommentProgramNode;
    buildElement(...args: TestElementArgs): ElementProgramNode;
    buildFragment(children: readonly TestChild[], expectation: Expects): FragmentProgramNode;
    render(node: ContentProgramNode, expectation: Expects): TestRoot;
}
export declare type Test = (args: {
    test: TestSupport;
    universe: Root;
}) => void | Promise<void>;
export { expect } from "./expect/expect.js";
export { toBe } from "./expect/patterns.js";
