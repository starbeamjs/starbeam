import { Enum } from "starbeam";
import { types } from "../support/expect/expect.js";
import { expect, test, toBe } from "../support/index.js";
test("a simple unit enum", () => {
    class Bool extends Enum("true", "false") {
    }
    expect(stringify(Bool.true()), toBe("true"));
    expect(stringify(Bool.false()), toBe("false"));
    function stringify(bool) {
        return bool.match({
            true: () => "true",
            false: () => "false",
        });
    }
});
test("a simple unit enum with methods", () => {
    class Bool extends Enum("true", "false") {
        ifTrue(callback) {
            return this.match({
                true: callback,
                false: () => undefined,
            });
        }
    }
    expect(ifTrue(Bool.true()), toBe("true"));
    expect(ifTrue(Bool.false()), toBe(undefined));
    function ifTrue(bool) {
        return bool.ifTrue(() => "true");
    }
});
test("a more elaborate generic enum", () => {
    class Option extends Enum("None", "Some(T)") {
    }
    expect(stringify(Option.Some(1)), toBe("1"));
    expect(stringify(Option.None()), toBe("None"));
    types(() => {
        // @ts-expect-error stringify expects an Option<number>, but we passed Option<string>
        stringify(Option.Some("hello"));
        stringify(Option.None());
    });
    function stringify(option) {
        return option.match({
            Some: (value) => String(value),
            None: () => "None",
        });
    }
});
test("Async<T>", () => {
    class Async extends Enum("Loading", "Loaded(T)", "Error(U)") {
    }
    match(Async.Loading());
    match(Async.Loaded({ username: "@tomdale" }));
    types(() => {
        // @ts-expect-error Async.Loaded expects a User, but we passed an Error
        match(Async.Loaded(Error("hi")));
        // @ts-expect-error Async.Error expects an Error, but we passed a user
        match(Async.Error({ username: "@tomdale" }));
    });
    match(Async.Error(Error("omg")));
    function match(async) {
        return async.match({
            Loading: () => "loading...",
            Loaded: (user) => user.username,
            Error: (error) => error.stack ?? "(no stack)",
        });
    }
});
//# sourceMappingURL=enum.spec.js.map