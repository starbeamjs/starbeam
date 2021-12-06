import { ReactiveElementBuilder } from "../output/element";
import { ReactiveTextNode } from "../output/text";
import { Reactive } from "../reactive/core";
import { DomTypes } from "./implementation";

export const APPEND = Symbol("APPEND");

export class DOM<T extends DomTypes> {
  text(data: Reactive<string>): ReactiveTextNode<T> {
    return new ReactiveTextNode(data);
  }

  element(_tagName: Reactive<string>): ReactiveElementBuilder<T> {
    return new ReactiveElementBuilder(_tagName);
  }
}

export * from "./implementation";
export * from "./cursor";
