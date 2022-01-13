import type { Component } from "./program-node/component";
import { ElementProgramNodeBuilder } from "./program-node/element";
import { Loop, ListProgramNode } from "./program-node/list/loop";
import { CommentProgramNode, TextProgramNode } from "./program-node/data";
import type { Reactive } from "./reactive/core";
import type { ReactiveParameter } from "./reactive/parameter";

export const APPEND = Symbol("APPEND");

export class ReactiveDOM {
  text(data: Reactive<string>): TextProgramNode {
    return TextProgramNode.of(data);
  }

  comment(data: Reactive<string>): CommentProgramNode {
    return CommentProgramNode.of(data);
  }

  element(tagName: Reactive<string>): ElementProgramNodeBuilder {
    return new ElementProgramNodeBuilder(tagName);
  }

  list<P extends ReactiveParameter>(
    iterable: Reactive<Iterable<P>>,
    component: Component<P>,
    key: (arg: P) => unknown = (arg) => arg
  ): ListProgramNode {
    return Loop.from(iterable, component, key).list();
  }
}

export * from "./dom/buffer/body";
export * from "./dom/buffer/attribute";
