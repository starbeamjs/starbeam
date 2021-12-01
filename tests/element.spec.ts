import {
  Timeline,
  Reactive,
  ReactiveTextNode,
  SimpleDomTypes,
} from "../src/index";

let timeline = Timeline.simpleDOM();

afterEach(() => (timeline = Timeline.simpleDOM()));

enum Expects {
  dynamic = "dynamic",
  static = "static",
}

test.skip("dynamic element", () => {
  let cell = timeline.reactive("hello");
  let text = buildText(cell, Expects.dynamic);

  let node = render(text, Expects.dynamic);
  expect(node.nodeValue).toBe("hello");
});

test.skip("static text", () => {
  let hello = timeline.static("hello");
  let text = buildText(hello, Expects.static);

  let node = render(text, Expects.static);
  expect(node.nodeValue).toBe("hello");
});

const normalize = (isStatic: boolean): Expects =>
  isStatic ? Expects.static : Expects.dynamic;

const buildText = (reactive: Reactive<string>, expectation: Expects) => {
  let text = timeline.dom.text(reactive);
  expect(normalize(text.metadata.isStatic)).toBe(expectation);
  return text;
};

const render = (
  text: ReactiveTextNode<SimpleDomTypes>,
  expectation: Expects
) => {
  let { node, metadata } = timeline.render(text);

  expect(
    normalize(metadata.isConstant),
    `Render should produce ${expectation} output.`
  ).toBe(expectation);

  return node;
};
