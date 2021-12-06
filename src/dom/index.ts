import { ReactiveTextNode } from "../output/text";
import { ReactiveElementNode } from "../output/element";
import { Reactive } from "../reactive/interface";
import { DomTypes } from "./implementation";

export const APPEND = Symbol("APPEND");

export class DOM<T extends DomTypes> {
  text(data: Reactive<string>): ReactiveTextNode<T> {
    return new ReactiveTextNode(data);
  }

  element(_tagName: Reactive<string>): ReactiveElementNode<T> {
    return new ReactiveElementNode();
  }
}

export * from "./implementation";
export * from "./cursor";
