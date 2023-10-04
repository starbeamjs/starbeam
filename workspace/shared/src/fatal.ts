export function fatal(_: never): never {
  throw Error("Unreachable");
}

export interface ErrorReporter {
  fatal: (message: string) => never;
}
