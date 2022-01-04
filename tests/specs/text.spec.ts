import { test, Expects, expect, toBe } from "../support";

test("dynamic text", ({ universe: timeline, test }) => {
  let cell = timeline.cell("hello");
  let text = test.buildText(cell, Expects.dynamic);

  let { result, into } = test.render(text, Expects.dynamic);
  expect(into.innerHTML, toBe("hello"));

  cell.update("goodbye");
  timeline.poll(result);

  expect(into.innerHTML, toBe("goodbye"));
});

test("static text", ({ universe: timeline, test }) => {
  let hello = timeline.static("hello");
  let text = test.buildText(hello, Expects.static);

  let { into } = test.render(text, Expects.static);
  expect(into.innerHTML, toBe("hello"));
});
