import { Expects, test } from "../support";
import { Dynamism } from "../support/expect/expect";

test("dynamic text", ({ universe: timeline, test }) => {
  let cell = timeline.cell("hello");
  let text = test.buildText(cell, Dynamism.dynamic);

  test
    .render(text, Expects.dynamic.html("hello"))
    .update([cell, "goodbye"], Expects.html("goodbye"));
});

test("static text", ({ universe: timeline, test }) => {
  let hello = timeline.static("hello");
  let text = test.buildText(hello, Dynamism.static);

  test.render(text, Expects.static.html("hello"));
});
