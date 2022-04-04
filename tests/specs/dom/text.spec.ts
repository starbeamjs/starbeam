import { Cell, Formula, Reactive } from "@starbeam/reactive";
import { Dynamism } from "../../support/expect/expect.js";
import { Expects, test } from "../../support/index.js";
import { testName } from "../formula.spec.js";

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

test("universe.memo => text", ({ universe, test }) => {
  let person = testName("Tom", "Dale");

  let text = test.buildText(
    Formula(() => person.fullName),
    Dynamism.Dynamic()
  );

  test
    .render(text, Expects.dynamic.html("Tom Dale"))
    .update(() => (person.firstName = "Thomas"), Expects.html("Thomas Dale"));
});
