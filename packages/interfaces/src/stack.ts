export interface Stack {
  readonly caller: StackFrame | undefined;
  readonly stack: string;
}

export interface StackFrameDisplayOptions {
  readonly root?: string;
}

export interface StackFrame {
  /**
   * A link to the file/line/column that this stack frame represents, in a format suitable to be
   * used in console.log()s in browser devtools.
   */
  link(options?: StackFrameDisplayOptions): string;

  /**
   * A displayable representation of the stack frame.
   */
  display(options?: StackFrameDisplayOptions): string;
}
