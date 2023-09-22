export interface Command {
  readonly name: string;
  readonly flags: readonly Flag[];
}

export type Flag =
  | `--${string}`
  | [short: `-${string}`, long: `--${string}`]
  | {
      readonly short: `-${string}`;
      readonly long: `--${string}`;
    };
