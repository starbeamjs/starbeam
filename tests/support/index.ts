import * as starbeam from "../../src/index";
export { starbeam };
import type * as dom from "@simple-dom/interface";
import { upstream } from "../jest-ext";
import { createDocument } from "simple-dom";
import { ElementArgs, TestElementArgs } from "./element";
import { Expects } from "./expect/expect";
export { dom };

export { Expects, expect } from "./expect/expect";
export { toBe } from "./expect/patterns/comparison";

export interface TestArgs {
  readonly universe: starbeam.Universe<starbeam.SimpleDomTypes>;
  readonly test: TestSupport;
  readonly dom: starbeam.DOM<starbeam.SimpleDomTypes>;
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
export type TestDOM = starbeam.DOM<starbeam.SimpleDomTypes>;
export type TestDocument = dom.SimpleDocument;

class TestSupport {
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

  render<N extends starbeam.DomType<starbeam.SimpleDomTypes>>(
    text: starbeam.Output<starbeam.SimpleDomTypes, N>,
    expectation: Expects
  ): starbeam.Rendered<starbeam.SimpleDomTypes, N> {
    let element = this.#document.createElement("div");
    let rendered = this.universe.renderIntoElement(text, element);

    expect(
      normalize(rendered.metadata.isConstant),
      `Render should produce ${expectation} output.`
    ).toBe(expectation);

    return rendered;
  }

  update<T>(
    rendered: starbeam.Rendered<
      starbeam.SimpleDomTypes,
      starbeam.DomType<starbeam.SimpleDomTypes>
    >,
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
