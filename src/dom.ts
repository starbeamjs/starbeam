import { ReactiveElementBuilder } from "./output/element";
import {
  ReactiveTextNode,
  ReactiveDataNode,
  ReactiveCommentNode,
} from "./output/text";
import type { Reactive } from "./reactive/core";
import type { DomTypes } from "./dom/types";
import type { ReactiveParameter } from "./reactive/parameter";
import type { Component } from "./output/component";
import { ReactiveListNode } from "./output/list";

export const APPEND = Symbol("APPEND");

export class ReactiveDOM<T extends DomTypes> {
  text(data: Reactive<string>): ReactiveTextNode<T> {
    return ReactiveDataNode.text(data);
  }

  comment(data: Reactive<string>): ReactiveCommentNode<T> {
    return ReactiveDataNode.comment(data);
  }

  element(tagName: Reactive<string>): ReactiveElementBuilder<T> {
    return new ReactiveElementBuilder(tagName);
  }

  list<P extends ReactiveParameter>(
    iterable: Reactive<Iterable<P>>,
    component: Component<P, T>,
    key: (arg: P) => unknown = (arg) => arg
  ): ReactiveListNode<T, P> {
    return ReactiveListNode.create(iterable, component, key);
  }
}

export * from "./dom/cursor";
export * from "./dom/implementation";
export type { AnyAttributeName } from "./dom/tree-construction";
export type { DomType, DomTypes } from "./dom/types";
