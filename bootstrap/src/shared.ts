export function exhaustive(value: never, description: string): never {
  throw Error(`Expected ${description} to be exhaustively checked`);
}
