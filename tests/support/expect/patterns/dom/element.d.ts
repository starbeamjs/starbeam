import type { SimpleElement, SimpleNode } from "@simple-dom/interface";
import { type NodeTypePattern } from "./node.js";
import { Described, type Pattern, type PatternResult } from "../../expect.js";
import { type PatternDetails, Success, type Failure } from "../../report.js";
export interface SimpleElementPatternOptions {
    tagName?: string;
    attributes?: Record<string, string | null>;
    children?: readonly NodeTypePattern<SimpleNode>[];
}
export interface MissingNode {
    type: "missing-node";
    expected: NodePattern;
}
export interface ExtraNode {
    type: "extra-node";
    node: SimpleNode;
}
export interface WrongNodeType {
    type: "wrong-node-type";
    actual: number;
}
interface WrongElementDetails {
    type: "wrong-element-details";
    tagName?: DidntMatch<string, string>;
    attributes?: Readonly<Record<string, DidntMatch<string | null, string | null>>>;
    children?: readonly PatternResult<WrongNode>[];
}
declare type WrongNode = WrongNodeType | WrongElementDetails | MissingNode | ExtraNode;
declare type SimpleElementMismatch = WrongNodeType | WrongElementDetails;
declare type DidntMatch<Actual, Expected> = {
    expected: Expected;
    actual: Actual;
};
export declare class SimpleElementPattern implements Pattern<SimpleNode, SimpleElement, SimpleElementMismatch> {
    readonly options: SimpleElementPatternOptions;
    readonly details: PatternDetails;
    constructor(options: SimpleElementPatternOptions, scenario: string | undefined);
    when(scenario: string): SimpleElementPattern;
    check({ value: node, }: Described<SimpleNode>): PatternResult<SimpleElementMismatch>;
    success(): Success;
    failure(_actual: Described<SimpleElement>, failure: SimpleElementMismatch): Failure;
}
declare type NodePattern = SimpleElementPattern | NodeTypePattern<SimpleNode>;
export {};
//# sourceMappingURL=element.d.ts.map