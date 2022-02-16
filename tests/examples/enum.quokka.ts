import { Enum } from "starbeam";

interface User {
  name: string;
}

class Option<T> extends Enum("Some(T)", "None")<T> {
  map<U>(callback: (value: T) => U): Option<U> {
    return this.match({
      Some: (value) => Option.Some(callback(value)),
      None: () => Option.None(),
    });
  }
}

const x: Option<string> = Option.Some("@littledan");
const y = x.map((name) => (name === "@littledan" ? "Daniel" : name));

y; //?

function getName(value: Option<User>): string {
  return value.match({
    None: () => "missing",
    Some: (value) => value.name,
  });
}

getName(Option.None()); //?
getName(Option.Some({ name: "@tomdale" })); //?
getName(Option.Some({ name: "@wycats" })); //?

class Async<T, U> extends Enum("Loading", "Loaded(T)", "Error(U)")<T, U> {}

function getStatus(value: Async<User, Error>): string {
  return value.match({
    Loading: () => "Loading...",
    Loaded: (user) => `[User] ${user.name}`,
    Error: (error) => `[ERROR] ${error.message}`,
  });
}

getStatus(Async.Loading());
getStatus(Async.Loaded({ name: "@tomdale" }));
getStatus(Async.Error(Error("oh noes!!!")));
