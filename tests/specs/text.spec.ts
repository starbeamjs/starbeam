import { test, Expects, expect, toBe, innerHTML } from "../support";

test("dynamic text", ({ universe: timeline, test }) => {
  let cell = timeline.cell("hello");
  let text = test.buildText(cell, Expects.dynamic);

  let { result, into } = test.render(text, Expects.dynamic);
  expect(innerHTML(into), toBe("hello"));

  cell.update("goodbye");
  timeline.poll(result);

  expect(innerHTML(into), toBe("goodbye"));
});

test("static text", ({ universe: timeline, test }) => {
  let hello = timeline.static("hello");
  let text = test.buildText(hello, Expects.static);

  let { into } = test.render(text, Expects.static);
  expect(innerHTML(into), toBe("hello"));
});
