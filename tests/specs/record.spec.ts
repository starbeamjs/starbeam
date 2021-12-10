import { test, Expects } from "../support";

test("a record is a reactive value", ({ timeline, test }) => {
  let first = timeline.cell("Tom");
  let last = timeline.cell("Dale");
  let id = timeline.static(1);

  let record = timeline.record({ first, last, id });

  let text = test.buildText(record.get("first"), Expects.dynamic);

  let result = test.render(text, Expects.dynamic);
  expect(result.node.nodeValue).toBe("Tom");

  first.update("Thomas");
  timeline.poll(result);

  expect(result.node.nodeValue).toBe("Thomas");
});
