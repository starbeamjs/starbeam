import { ReactiveTextNode } from "../output/text";
import { Reactive } from "../reactive/interface";
import { DomTypes } from "./implementation";

export const APPEND = Symbol("APPEND");

export class DOM<T extends DomTypes> {
  text(data: Reactive<string>): ReactiveTextNode<T> {
    return new ReactiveTextNode(data);
  }

  element(tagName: Reactive<string>): ReactiveElement<T> {
    return new ReactiveElement(data);
  }
}

export * from "./implementation";
export * from "./cursor";
