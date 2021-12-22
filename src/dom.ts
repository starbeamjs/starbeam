import type { AnyNode } from ".";
import type { DomTypes } from "./dom/types";
import type { Component } from "./output/component";
import { ElementProgramNodeBuilder } from "./output/element";
import { Loop, ReactiveListNode } from "./output/list";
import {
  CommentProgramNode,
  DataProgramNode,
  TextProgramNode,
} from "./output/data";
import type { Reactive } from "./reactive/core";
import type { ReactiveParameter } from "./reactive/parameter";

export const APPEND = Symbol("APPEND");

export class ReactiveDOM<T extends DomTypes> {
  text(data: Reactive<string>): TextProgramNode {
    return DataProgramNode.text(data);
  }

  comment(data: Reactive<string>): CommentProgramNode {
    return DataProgramNode.comment(data);
  }

  element(tagName: Reactive<string>): ElementProgramNodeBuilder<T> {
    return new ElementProgramNodeBuilder(tagName);
  }

  list<P extends ReactiveParameter>(
    iterable: Reactive<Iterable<P>>,
    component: Component<P, T, AnyNode<T>>,
    key: (arg: P) => unknown = (arg) => arg
  ): ReactiveListNode<T> {
    return Loop.from(iterable, component, key).list();
  }
}

export * from "./dom/cursor/updating";
export * from "./dom/cursor/append";
export type { AnyAttributeName } from "./dom/tree-construction";
export type { AnyNode, DomTypes } from "./dom/types";
