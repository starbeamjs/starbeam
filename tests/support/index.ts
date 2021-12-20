import * as starbeam from "../../src/index";
export { starbeam };

import type * as Browser from "@domtree/browser";
export { Browser as browser };

import type * as Minimal from "@domtree/minimal";
export { Minimal };

import { dom } from "../../src/index";
export { dom };
export { DOM } from "../../src/index";

import * as simple from "simple-dom";
export { simple };

import type * as Simple from "@domtree/simple";
export { Simple };

export { Expects, expect } from "./expect/expect";
export { toBe } from "./expect/patterns/comparison";

import { upstream } from "../jest-ext";
import { createDocument, HTMLSerializer, voidMap } from "simple-dom";
import { ElementArgs, TestElementArgs } from "./element";
import { Expects } from "./expect/expect";
import type { SimpleDocumentFragment } from "@simple-dom/interface";

export interface TestArgs {
  readonly universe: starbeam.Universe<starbeam.SimpleDomTypes>;
  readonly test: TestSupport;
  readonly dom: starbeam.ReactiveDOM<starbeam.SimpleDomTypes>;
}

export function test(
  name: string,
  test: (args: TestArgs) => void | Promise<void>
): void {
  upstream.test(name, () => {
    let support = TestSupport.create();

    return test({
      test: support,
      universe: support.universe,
      dom: support.dom,
    }) as Promise<unknown>;
  });
}

export type TestUniverse = starbeam.Universe<starbeam.SimpleDomTypes>;
export type TestDOM = starbeam.ReactiveDOM<starbeam.SimpleDomTypes>;
export type TestDocument = Simple.Document;

export class TestSupport {
  static create(document = createDocument()): TestSupport {
    return new TestSupport(document);
  }

  readonly universe: TestUniverse;
  readonly dom: TestDOM;

  #document: TestDocument;

  private constructor(document: TestDocument) {
    this.#document = document;
    this.universe = starbeam.Universe.simpleDOM(document);
    this.dom = this.universe.dom;
  }

  buildText(
    reactive: starbeam.Reactive<string>,
    expectation: Expects
  ): starbeam.ReactiveTextNode<starbeam.SimpleDomTypes> {
    let text = this.universe.dom.text(reactive);
    expect(normalize(text.metadata.isStatic)).toBe(expectation);
    return text;
  }

  buildComment(
    reactive: starbeam.Reactive<string>,
    expectation: Expects
  ): starbeam.ReactiveCommentNode<starbeam.SimpleDomTypes> {
    let comment = this.universe.dom.comment(reactive);
    expect(normalize(comment.metadata.isStatic)).toBe(expectation);
    return comment;
  }

  buildElement(
    ...args: TestElementArgs
  ): starbeam.ReactiveElementNode<starbeam.SimpleDomTypes> {
    let { tagName, build, expectation } = ElementArgs.normalize(
      this.universe,
      args
    );
    let element = starbeam.ReactiveElementBuilder.build(tagName, build);
    expect(normalize(element.metadata.isStatic)).toBe(expectation);
    return element;
  }

  hydrate(
    fragment: dom.CompatibleDocumentFragment,
    tokens: Set<starbeam.Token>
  ): starbeam.HydratedTokens {
    return starbeam.TreeHydrator.hydrate(this.#document, fragment, tokens);
  }

  render<O extends starbeam.Output<starbeam.SimpleDomTypes>>(
    output: O,
    expectation: Expects
  ): {
    result: starbeam.Rendered<starbeam.SimpleDomTypes>;
    into: Simple.Element;
  } {
    let element = this.#document.createElement("div");
    let result = this.universe.renderIntoElement(output, element);

    expect(
      normalize(result.metadata.isConstant),
      `Render should produce ${expectation} output.`
    ).toBe(expectation);

    return { result, into: element };
  }

  update<T>(
    rendered: starbeam.Rendered<starbeam.SimpleDomTypes>,
    cell: starbeam.Cell<T>,
    value: T
  ): void {
    cell.update(value);
    this.universe.poll(rendered);
  }
}

export type Test = (args: {
  test: TestSupport;
  universe: starbeam.Universe;
}) => void | Promise<void>;

function normalize(isStatic: boolean): Expects {
  return isStatic ? Expects.static : Expects.dynamic;
}

export function innerHTML(element: Simple.Element): string {
  let serializer = new HTMLSerializer(voidMap);
  return serializer.serializeChildren(element);
}

export function outerHTML(element: Simple.Element): string {
  let serializer = new HTMLSerializer(voidMap);
  return serializer.serialize(element);
}
