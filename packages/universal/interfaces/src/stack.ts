export interface Stack {
  readonly caller: StackFrame | undefined;
  readonly stack: string;
}

export interface StackFrameDisplayOptions {
  readonly root?: string;
  readonly roots?: Record<string, string>;
  /**
   * display the entire stack trace
   */
  readonly complete?: boolean;
}

export interface StackFrame {
  readonly starbeamCaller:
    | { package: string; api?: string | undefined }
    | undefined;

  /**
   * A link to the file/line/column that this stack frame represents, in a format suitable to be
   * used in console.log()s in browser devtools.
   */
  link(options?: StackFrameDisplayOptions | undefined): string;

  /**
   * A displayable representation of the stack frame.
   */
  display(options?: StackFrameDisplayOptions | undefined): string;

  parts(options?: StackFrameDisplayOptions | undefined): DisplayParts;
}

export interface DisplayRoot {
  name?: string | undefined;
  prefix: string;
}

export interface Loc {
  line: number;
  column?: number | undefined;
}

export interface DisplayParts {
  readonly path: string;
  readonly root: DisplayRoot | undefined;
  readonly action: string | undefined;
  readonly loc: Loc | undefined;

  display(): string;
}
