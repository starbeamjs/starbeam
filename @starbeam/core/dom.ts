import type { Component } from "./program-node/component.js";
import {
  ElementProgramNode,
  ElementProgramNodeBuilder,
} from "./program-node/element.js";
import { Loop, type ListProgramNode } from "./program-node/list/loop.js";
import { CommentProgramNode, TextProgramNode } from "./program-node/data.js";
import type { ReactiveParameter } from "./reactive/parameter.js";
import {
  FragmentProgramNode,
  FragmentProgramNodeBuilder,
} from "./program-node/fragment.js";
import { Reactive } from "./reactive/reactive.js";

export const APPEND = Symbol("APPEND");

export class ReactiveDOM {
  text(data: Reactive<string>): TextProgramNode {
    return TextProgramNode.of(data);
  }

  comment(data: Reactive<string>): CommentProgramNode {
    return CommentProgramNode.of(data);
  }

  element(tagName: Reactive<string> | string): ElementProgramNodeBuilder;
  element(
    tagName: Reactive<string> | string,
    callback: (builder: ElementProgramNodeBuilder) => void
  ): ElementProgramNode;
  element(
    tagName: Reactive<string> | string,
    callback?: (builder: ElementProgramNodeBuilder) => void
  ): ElementProgramNode | ElementProgramNodeBuilder {
    let builder = new ElementProgramNodeBuilder(Reactive.from(tagName));

    if (callback) {
      callback(builder);
      return builder.finalize();
    } else {
      return builder;
    }
  }

  fragment(
    build: (builder: FragmentProgramNodeBuilder) => void
  ): FragmentProgramNode {
    return FragmentProgramNodeBuilder.build(build);
  }

  list<P extends ReactiveParameter>(
    iterable: Reactive<Iterable<P>>,
    component: Component<P>,
    key: (arg: P) => unknown
  ): ListProgramNode {
    return Loop.from(iterable, component, key).list();
  }
}

export * from "./dom/buffer/body.js";
export * from "./dom/buffer/attribute.js";
export * from "./dom/environment.js";
