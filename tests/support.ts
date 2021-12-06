import * as starbeam from "../src/index";
export { starbeam };
import type * as dom from "@simple-dom/interface";
import { upstream } from "./jest-ext";
import { createDocument } from "simple-dom";
export { dom };

export enum Expects {
  dynamic = "dynamic",
  static = "static",
}

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

class TestSupport {
  static create(document = createDocument()): TestSupport {
    return new TestSupport(document);
  }

  readonly timeline: starbeam.Timeline<starbeam.SimpleDomTypes>;
  readonly dom: starbeam.DOM<starbeam.SimpleDomTypes>;

  #document: dom.SimpleDocument;

  private constructor(document: dom.SimpleDocument) {
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
    tagName: starbeam.Reactive<string>,
    callback: (
      builder: starbeam.ReactiveElementBuilder<starbeam.SimpleDomTypes>
    ) => void,
    expectation: Expects
  ): starbeam.ReactiveElementNode<starbeam.SimpleDomTypes> {
    let element = starbeam.ReactiveElementBuilder.build(tagName, callback);
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
}

export type Test = (args: {
  test: TestSupport;
  timeline: starbeam.Timeline;
}) => void | Promise<void>;

function normalize(isStatic: boolean): Expects {
  return isStatic ? Expects.static : Expects.dynamic;
}
