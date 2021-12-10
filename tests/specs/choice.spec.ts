import { expect, starbeam, test, toBe } from "../support";

function StringType(value: unknown): value is string {
  return typeof value === "string";
}

const BooleanChoice = starbeam.Choices((c) => c.add("true").add("false"));

const OptionalString = starbeam.Choices((c) =>
  c.add("Some", StringType).add("None")
);

test("choice (unit, static)", ({ timeline }) => {
  let truth = timeline.static(BooleanChoice("true"));
  let value = timeline.match(truth, {
    true: () => "YES",
    false: () => "NO",
  });

  expect(value.current, toBe("YES"));
});

test("choice (unit, dynamic)", ({ timeline }) => {
  let bool = timeline.cell(BooleanChoice("true"));
  let value = timeline.match(bool, {
    true: () => "YES",
    false: () => "NO",
  });

  expect(value.current, toBe("YES"));

  bool.update(BooleanChoice("false"));

  expect(value.current, toBe("NO"));
});

test("choice (tuple, static)", ({ timeline }) => {
  let name = timeline.static(OptionalString("Some", timeline.static("Tom")));
  let value = timeline.match(name, {
    Some: (name) => name.toUpperCase(),
    None: () => "anonymous",
  });

  expect(value.current, toBe("TOM"));
});

test("choice (unit, dynamic top-level)", ({ timeline }) => {
  let name = timeline.cell(OptionalString("Some", timeline.static("Tom")));

  let value = timeline.match(name, {
    Some: (name) => name.toUpperCase(),
    None: () => "anonymous",
  });

  expect(value.current, toBe("TOM"));

  name.update(OptionalString("None"));

  expect(value.current, toBe("anonymous"));
});

test("choice (unit, dynamic)", ({ timeline }) => {
  let name = timeline.cell("Tom");
  let optionalName = timeline.cell(OptionalString("Some", name));

  let value = timeline.match(optionalName, {
    Some: (name) => name.toUpperCase(),
    None: () => "anonymous",
  });

  expect(value.current, toBe("TOM"));

  name.update("Thomas");

  expect(value.current, toBe("THOMAS"));

  optionalName.update(OptionalString("None"));

  expect(value.current, toBe("anonymous"));
});
