import { test, expect, toBe } from "../support";

test("timeline.memo", ({ timeline }) => {
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

test("nested timeline.memo", ({ timeline }) => {
  let firstName = timeline.cell("Tom");
  let lastName = timeline.cell("Dale");

  let firstNameMemo = timeline.memo(() => {
    return firstName.current;
  });

  let lastNameMemo = timeline.memo(() => {
    return lastName.current;
  });

  let fullNameMemo = timeline.memo(() => {
    return `${firstNameMemo.current} ${lastNameMemo.current}`;
  });

  expect(fullNameMemo.current, toBe("Tom Dale"));

  firstName.update("Thomas");

  expect(fullNameMemo.current, toBe("Thomas Dale"));
});
