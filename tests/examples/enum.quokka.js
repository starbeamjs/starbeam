import { Enum } from "@starbeam/core";
class Option extends Enum("Some(T)", "None") {
    map(callback) {
        return this.match({
            Some: (value) => Option.Some(callback(value)),
            None: () => Option.None(),
        });
    }
}
const x = Option.Some("@littledan");
const y = x.map((name) => (name === "@littledan" ? "Daniel" : name));
y; //?
function getName(value) {
    return value.match({
        None: () => "missing",
        Some: (value) => value.name,
    });
}
getName(Option.None()); //?
getName(Option.Some({ name: "@tomdale" })); //?
getName(Option.Some({ name: "@wycats" })); //?
class Async extends Enum("Loading", "Loaded(T)", "Error(U)") {
}
function getStatus(value) {
    return value.match({
        Loading: () => "Loading...",
        Loaded: (user) => `[User] ${user.name}`,
        Error: (error) => `[ERROR] ${error.message}`,
    });
}
getStatus(Async.Loading());
getStatus(Async.Loaded({ name: "@tomdale" }));
getStatus(Async.Error(Error("oh noes!!!")));
//# sourceMappingURL=enum.quokka.js.map