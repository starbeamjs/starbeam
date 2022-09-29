class Escaped {
  #value: unknown;
}

interface Escape {
  (strings: readonly string[], ...interpolated: readonly unknown[]): string;
  escape(...args: unknown[]): Escaped;
}

const DEFAULT: Escape;
export default DEFAULT;
