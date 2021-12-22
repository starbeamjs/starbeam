import type { SimpleElement } from "@simple-dom/interface";
import { expect, Expects, innerHTML, test, toBe } from "../support";
import { Component, Reactive, SimpleDomTypes } from "../support/starbeam";
import type { TestDOM } from "../support/define";

test("a simple, static list", ({ universe, test }) => {
  const dom = universe.dom;
  const Name = NameComponent(dom);

  let state = {
    tom: universe.cell("Tom"),
    yehuda: universe.cell("Yehuda"),
    chirag: universe.cell("Chirag"),
  };

  let names = Reactive.from(Object.values(state));

  let { result, into } = test.render(dom.list(names, Name), Expects.dynamic);

  expect(innerHTML(into), toBe("<p>Tom</p><p>Yehuda</p><p>Chirag</p>"));

  universe.poll(result);

  expect(innerHTML(into), toBe("<p>Tom</p><p>Yehuda</p><p>Chirag</p>"));

  state.yehuda.update("@wycats");

  universe.poll(result);

  expect(innerHTML(into), toBe("<p>Tom</p><p>@wycats</p><p>Chirag</p>"));
});

test("a simple, dynamic list", ({ universe, test }) => {
  const dom = universe.dom;
  const Name = NameComponent(dom);

  let state = {
    tom: universe.cell("Tom"),
    yehuda: universe.cell("Yehuda"),
    chirag: universe.cell("Chirag"),
  };

  let names = universe.cell(Object.values(state));

  let { result, into } = test.render(dom.list(names, Name), Expects.dynamic);

  expect(innerHTML(into), toBe("<p>Tom</p><p>Yehuda</p><p>Chirag</p>"));

  universe.poll(result);

  expect(innerHTML(into), toBe("<p>Tom</p><p>Yehuda</p><p>Chirag</p>"));

  names.update([state.chirag, state.yehuda, state.tom]);

  universe.poll(result);
  expect(innerHTML(into), toBe("<p>Chirag</p><p>Yehuda</p><p>Tom</p>"));

  state.yehuda.update("@wycats");

  universe.poll(result);
  expect(innerHTML(into), toBe("<p>Chirag</p><p>@wycats</p><p>Tom</p>"));
});

function NameComponent(
  dom: TestDOM
): Component<Reactive<string>, SimpleDomTypes, SimpleElement> {
  return function Name(name: Reactive<string>) {
    return dom.element(Reactive.from("p")).append(dom.text(name)).finalize();
  };
}
