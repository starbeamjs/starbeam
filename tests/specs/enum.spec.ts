import { Enum } from "starbeam";
import { expect, test, toBe } from "../support/index.js";

test("a simple unit enum", () => {
  class Bool extends Enum("true", "false") {}

  expect(stringify(Bool.true), toBe("true"));
  expect(stringify(Bool.false), toBe("false"));

  function stringify(bool: Bool): string {
    return bool.match({
      true: () => "true",
      false: () => "false",
    });
  }
});

test("a more elaborate generic enum", () => {
  class Option<T> extends Enum("None", "Some(T)")<T> {}

  expect(stringify(Option.Some(1)), toBe("1"));
  expect(stringify(Option.None), toBe("None"));

  function stringify(option: Option<number>): string {
    return option.match({
      Some: (value) => String(value),
      None: () => "None",
    });
  }
});

test("Async<T>", () => {
  class Async<T, U> extends Enum("Loading", "Loaded(T)", "Error(U)")<T, U> {}

  match(Async.Loading);
  match(Async.Loaded({ name: "@tomdale" }));
  match(Async.Loaded(Error("hi")));
  match(Async.Error(Error("omg")));

  function match(async: Async<{ name: string }, Error>): string {
    return async.match({
      Loading: () => "loading...",
      Loaded: (user) => user.name,
      Error: (error) => error.stack ?? "(no stack)",
    });
  }
});
