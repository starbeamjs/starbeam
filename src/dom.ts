import { ReactiveElementBuilder } from "./output/element";
import {
  ReactiveTextNode,
  ReactiveDataNode,
  ReactiveCommentNode,
} from "./output/text";
import type { Reactive } from "./reactive/core";
import type { DomTypes } from "./dom/types";

export const APPEND = Symbol("APPEND");

export class DOM<T extends DomTypes> {
  text(data: Reactive<string>): ReactiveTextNode<T> {
    return ReactiveDataNode.text(data);
  }

  comment(data: Reactive<string>): ReactiveCommentNode<T> {
    return ReactiveDataNode.comment(data);
  }

  element(tagName: Reactive<string>): ReactiveElementBuilder<T> {
    return new ReactiveElementBuilder(tagName);
  }
}

export * from "./dom/cursor";
export * from "./dom/implementation";
export type { AnyAttributeName } from "./dom/tree-construction";
export type { DomType, DomTypes } from "./dom/types";
