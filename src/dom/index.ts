import { ReactiveTextNode } from "../output/text";
import { Reactive } from "../reactive/interface";
import { DomTypes } from "./implementation";

export const APPEND = Symbol("APPEND");

export class DOM<T extends DomTypes> {
  text(data: Reactive<string>): ReactiveTextNode<T> {
    return new ReactiveTextNode(data);
  }
}

export * from "./implementation";
export * from "./cursor";
