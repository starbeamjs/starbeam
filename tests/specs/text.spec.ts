import { Expects, test } from "../support/index.js";
import { Dynamism } from "../support/expect/expect.js";

test("dynamic text", ({ universe: timeline, test }) => {
  let cell = timeline.cell("hello");
  let text = test.buildText(cell, Dynamism.dynamic);

  test
    .render(text, Expects.dynamic.html("hello"))
    .update([cell, "goodbye"], Expects.html("goodbye"));
});

test("static text", ({ universe: timeline, test }) => {
  let hello = timeline.static("hello");
  let text = test.buildText(hello, Dynamism.constant);

  test.render(text, Expects.constant.html("hello"));
});
