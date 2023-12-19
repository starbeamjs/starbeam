declare class Escaped {
  // eslint-disable-next-line no-unused-private-class-members
  #value: unknown;
}

interface Escape {
  (strings: readonly string[], ...interpolated: readonly unknown[]): string;
  escape: (...args: unknown[]) => Escaped;
}

declare const DEFAULT: Escape;
export default DEFAULT;
