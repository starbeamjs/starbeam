export type CallerStackFn = (internal?: number) => CallStack | undefined;

export interface CallStack {
  readonly header: string;
  readonly frames: readonly [StackFrame, ...StackFrame[]];
  slice: (n: number) => CallStack | undefined;
}

export interface StackFrame {
  readonly action: string;
  readonly module: ParsedModule;

  readonly loc: Loc | undefined;
}

export interface Loc {
  readonly line: number;
  readonly column: number | undefined;
}

export interface ParsedModule {
  root?: string | { package: string } | undefined;
  path: string;
}
