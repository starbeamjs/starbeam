import { Enum } from "@starbeam/utils";
import { types } from "../support/expect/expect.js";
import { expect, test, toBe } from "../support/index.js";

interface User {
  readonly username: string;
}

test("a simple unit enum", () => {
  class Bool extends Enum("true", "false") {}

  expect(stringify(Bool.true()), toBe("true"));
  expect(stringify(Bool.false()), toBe("false"));

  function stringify(bool: Bool): string {
    return bool.match({
      true: () => "true",
      false: () => "false",
    });
  }
});

test("a simple unit enum with methods", () => {
  class Bool extends Enum("true", "false") {
    ifTrue<T>(callback: () => T): T | void {
      return this.match({
        true: callback,
        false: () => undefined,
      });
    }
  }

  expect(ifTrue(Bool.true()), toBe("true"));
  expect(ifTrue(Bool.false()), toBe(undefined));

  function ifTrue(bool: Bool): string | void {
    return bool.ifTrue(() => "true");
  }
});

test("a more elaborate generic enum", () => {
  class Option<T> extends Enum("None", "Some(T)")<T> {}

  expect(stringify(Option.Some(1)), toBe("1"));
  expect(stringify(Option.None()), toBe("None"));

  types(() => {
    // @ts-expect-error stringify expects an Option<number>, but we passed Option<string>
    stringify(Option.Some("hello"));

    stringify(Option.None());
  });

  function stringify(option: Option<number>): string {
    return option.match({
      Some: (value) => String(value),
      None: () => "None",
    });
  }
});

test("Async<T>", () => {
  class Async<T, U> extends Enum("Loading", "Loaded(T)", "Error(U)")<T, U> {}

  match(Async.Loading());
  match(Async.Loaded({ username: "@tomdale" }));

  types(() => {
    // @ts-expect-error Async.Loaded expects a User, but we passed an Error
    match(Async.Loaded(Error("hi")));

    // @ts-expect-error Async.Error expects an Error, but we passed a user
    match(Async.Error({ username: "@tomdale" }));
  });

  match(Async.Error(Error("omg")));

  function match(async: Async<User, Error>): string {
    return async.match({
      Loading: () => "loading...",
      Loaded: (user) => user.username,
      Error: (error) => error.stack ?? "(no stack)",
    });
  }
});
