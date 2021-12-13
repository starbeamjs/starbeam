import { test, expect, toBe } from "../support";

test("createMemo", ({ timeline, test }) => {
  let name = timeline.cell("Tom");
  let counter = 0;

  let memo = timeline.memo(() => {
    counter++;
    return name.current;
  });

  expect(memo.current, toBe("Tom"));
  expect(counter, toBe(1));

  expect(memo.current, toBe("Tom"));
  expect(counter, toBe(1));

  name.update("Thomas");

  expect(memo.current, toBe("Thomas"));
  expect(counter, toBe(2));
});
