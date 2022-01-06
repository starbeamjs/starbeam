import type { RenderedElementNode } from "../../src/index";
import { expect, Expects, toBe } from "../support";
import { todo } from "../support/define";
import { Component, Reactive, ReactiveDOM } from "../support/starbeam";

todo("a simple, static list", ({ universe, test }) => {
  const dom = universe.dom;
  const Name = NameComponent(dom);

  let state = {
    tom: universe.cell("Tom"),
    yehuda: universe.cell("Yehuda"),
    chirag: universe.cell("Chirag"),
  };

  let names = Reactive.from(Object.values(state));

  let { result, into } = test.render(dom.list(names, Name), Expects.dynamic);

  expect(into.innerHTML, toBe("<p>Tom</p><p>Yehuda</p><p>Chirag</p>"));

  result.poll();

  expect(into.innerHTML, toBe("<p>Tom</p><p>Yehuda</p><p>Chirag</p>"));

  state.yehuda.update("@wycats");

  result.poll();

  expect(into.innerHTML, toBe("<p>Tom</p><p>@wycats</p><p>Chirag</p>"));
});

todo("a simple, dynamic list", ({ universe, test }) => {
  const dom = universe.dom;
  const Name = NameComponent(dom);

  let state = {
    tom: universe.cell("Tom"),
    yehuda: universe.cell("Yehuda"),
    chirag: universe.cell("Chirag"),
  };

  let names = universe.cell(Object.values(state));

  let { result, into } = test.render(dom.list(names, Name), Expects.dynamic);

  expect(into.innerHTML, toBe("<p>Tom</p><p>Yehuda</p><p>Chirag</p>"));

  result.poll();

  expect(into.innerHTML, toBe("<p>Tom</p><p>Yehuda</p><p>Chirag</p>"));

  names.update([state.chirag, state.yehuda, state.tom]);

  result.poll();
  expect(into.innerHTML, toBe("<p>Chirag</p><p>Yehuda</p><p>Tom</p>"));

  state.yehuda.update("@wycats");

  result.poll();
  expect(into.innerHTML, toBe("<p>Chirag</p><p>@wycats</p><p>Tom</p>"));
});

function NameComponent(
  dom: ReactiveDOM
): Component<Reactive<string>, RenderedElementNode> {
  return function Name(name: Reactive<string>) {
    return dom.element(Reactive.from("p")).append(dom.text(name)).finalize();
  };
}
