import { Cell, Reactive } from "@starbeam/reactive";
import { Dynamism } from "../support/expect/expect.js";
import { Expects, test } from "../support/index.js";

test("dynamic text", ({ test }) => {
  const hello = Cell("hello");
  const text = test.buildText(hello, Dynamism.Dynamic());

  test
    .render(text, Expects.dynamic.html("hello"))
    .update([hello, "goodbye"], Expects.html("goodbye"));
});

test("static text", ({ test }) => {
  let hello = Reactive.from("hello");
  let text = test.buildText(hello, Dynamism.Constant());

  test.render(text, Expects.constant.html("hello"));
});
