import type { Component } from "./program-node/component.js";
import { ElementProgramNodeBuilder } from "./program-node/element.js";
import { type ListProgramNode } from "./program-node/list/loop.js";
import { CommentProgramNode, TextProgramNode } from "./program-node/data.js";
import type { AbstractReactive } from "./reactive/core.js";
import type { ReactiveParameter } from "./reactive/parameter.js";
import { FragmentProgramNode, FragmentProgramNodeBuilder } from "./program-node/fragment.js";
export declare const APPEND: unique symbol;
export declare class ReactiveDOM {
    text(data: AbstractReactive<string>): TextProgramNode;
    comment(data: AbstractReactive<string>): CommentProgramNode;
    element(tagName: AbstractReactive<string>): ElementProgramNodeBuilder;
    fragment(build: (builder: FragmentProgramNodeBuilder) => void): FragmentProgramNode;
    list<P extends ReactiveParameter>(iterable: AbstractReactive<Iterable<P>>, component: Component<P>, key: (arg: P) => unknown): ListProgramNode;
}
export * from "./dom/buffer/body.js";
export * from "./dom/buffer/attribute.js";
export * from "./dom/environment.js";
