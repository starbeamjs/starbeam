export type Async<T> =
  | {
      status: "loading";
    }
  | {
      status: "success";
      value: T;
    }
  | {
      status: "error";
      value: unknown;
    };

export type InvalidatableAsync<T> =
  | Async<T>
  | {
      status: "reloading";
      value: Async<T>;
    };

export function getAsync<T>(value: InvalidatableAsync<T>): Async<T> {
  if (value.status === "reloading") {
    return getAsync(value.value);
  } else {
    return value;
  }
}
