import * as starbeam from "../../src/index";
export { starbeam };
import type * as dom from "@simple-dom/interface";
import { upstream } from "../jest-ext";
import { createDocument } from "simple-dom";
import { ElementArgs, TestChild, TestElementArgs } from "./element";
import { Expects } from "./expect/expect";
export { dom };

export { Expects, expect } from "./expect/expect";
export { toBe } from "./expect/patterns";

export interface TestArgs {
  readonly timeline: starbeam.Timeline<starbeam.SimpleDomTypes>;
  readonly test: TestSupport;
  readonly dom: starbeam.DOM<starbeam.SimpleDomTypes>;
}

export function test(
  name: string,
  def: (args: TestArgs) => void | Promise<void>
): void {
  upstream.test(name, () => {
    let support = TestSupport.create();
    return def({
      test: support,
      timeline: support.timeline,
      dom: support.dom,
    }) as Promise<unknown>;
  });
}

export type TestTimeline = starbeam.Timeline<starbeam.SimpleDomTypes>;
export type TestDOM = starbeam.DOM<starbeam.SimpleDomTypes>;
export type TestDocument = dom.SimpleDocument;

class TestSupport {
  static create(document = createDocument()): TestSupport {
    return new TestSupport(document);
  }

  readonly timeline: TestTimeline;
  readonly dom: TestDOM;

  #document: TestDocument;

  private constructor(document: TestDocument) {
    this.#document = document;
    this.timeline = starbeam.Timeline.simpleDOM(document);
    this.dom = this.timeline.dom;
  }

  buildText(
    reactive: starbeam.Reactive<string>,
    expectation: Expects
  ): starbeam.ReactiveTextNode<starbeam.SimpleDomTypes> {
    let text = this.timeline.dom.text(reactive);
    expect(normalize(text.metadata.isStatic)).toBe(expectation);
    return text;
  }

  buildElement(
    ...args: TestElementArgs
  ): starbeam.ReactiveElementNode<starbeam.SimpleDomTypes> {
    let { tagName, build, expectation } = ElementArgs.normalize(
      this.timeline,
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
    let rendered = this.timeline.renderIntoElement(text, element);

    expect(
      normalize(rendered.metadata.isConstant),
      `Render should produce ${expectation} output.`
    ).toBe(expectation);

    return rendered;
  }

  #intoChild(child: TestChild): starbeam.AnyOutput<starbeam.DomTypes> {
    if (typeof child === "string") {
      return this.dom.text(this.timeline.static(child));
    } else {
      return child;
    }
  }
}

export type Test = (args: {
  test: TestSupport;
  timeline: starbeam.Timeline;
}) => void | Promise<void>;

function normalize(isStatic: boolean): Expects {
  return isStatic ? Expects.static : Expects.dynamic;
}
