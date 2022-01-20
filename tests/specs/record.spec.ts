import { test, Expects } from "../support";
import { Dynamism } from "../support/expect/expect";

test("a record is a reactive value", ({ universe, test }) => {
  let first = universe.cell("Tom");
  let last = universe.cell("Dale");
  let id = universe.static(1);

  let record = universe.record({ first, last, id });

  let text = test.buildText(record.get("first"), Dynamism.dynamic);

  test
    .render(text, Expects.dynamic.html("Tom"))
    .update([first, "Thomas"], Expects.html("Thomas"));

  // result.update(first, "Thomas", Expects.html("Thomas"));
});
