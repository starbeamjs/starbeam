import { ReactiveElementBuilder } from "../output/element";
import { ReactiveTextNode } from "../output/text";
import type { Reactive } from "../reactive/core";
import type { DomTypes } from "./implementation";

export const APPEND = Symbol("APPEND");

export class DOM<T extends DomTypes> {
  text(data: Reactive<string>): ReactiveTextNode<T> {
    return new ReactiveTextNode(data);
  }

  element(tagName: Reactive<string>): ReactiveElementBuilder<T> {
    return new ReactiveElementBuilder(tagName);
  }
}

export * from "./cursor";
export * from "./implementation";
