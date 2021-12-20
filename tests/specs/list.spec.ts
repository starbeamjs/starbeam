import { expect, Expects, innerHTML, starbeam, test, toBe } from "../support";

const { Reactive } = starbeam;

test("a simple, static list", ({ universe, test }) => {
  const dom = universe.dom;

  let names = Reactive.from([
    universe.cell("Tom"),
    universe.cell("Yehuda"),
    universe.cell("Chirag"),
  ]);

  let { result, into } = test.render(dom.list(names, Name), Expects.dynamic);

  expect(innerHTML(into), toBe("<p>Tom</p><p>Yehuda</p><p>Chirag</p>"));

  universe.poll(result);

  function Name(name: starbeam.Reactive<string>) {
    return dom
      .element(starbeam.Reactive.from("p"))
      .append(dom.text(name))
      .finalize();
  }
});
