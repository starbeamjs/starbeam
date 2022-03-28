export function* enumerate<T>(iterable: Iterable<T>): Iterable<[number, T]> {
  let i = 0;

  for (let item of iterable) {
    yield [i++, item];
  }
}
