import { hasType, isObject, verified } from "@starbeam/verify";
import StackTracey from "stacktracey";

import { isDebug } from "./conditional.js";
import {
  type DescriptionArgs,
  type DescriptionDetails,
  Description,
} from "./description/reactive-value.js";
import { describeModule } from "./module.js";

type ErrorWithStack = Error & { stack: string };

export interface Stack {
  readonly caller: StackFrame | undefined;
  readonly stack: string;
}

export interface StackFrame {
  /**
   * A link to the file/line/column that this stack frame represents, in a format suitable to be
   * used in console.log()s in browser devtools.
   */
  readonly link: string;

  /**
   * A displayable representation of the stack frame.
   */
  readonly display: string;
}

export interface StackStatics {
  readonly EMPTY: Stack;

  create(this: void, internal?: number): Stack;
  fromStack(stack: string): Stack;

  from(error: ErrorWithStack): Stack;
  from(error: unknown): Stack | null;

  describeCaller(internal?: number): string;

  description(
    this: void,
    args: DescriptionArgs & {
      fromUser?: string | DescriptionDetails | Description;
    },
    internal?: number
  ): Description;

  fromCaller(this: void, internal?: number): Stack;

  replaceFrames(error: unknown, fromStack: Stack): void;

  /**
   * Erase an abstraction from the call stack so the test error points at the user code, rather than
   * the abstraction's code.
   *
   * Call a callback, and if the callback throws an exception, remove the current frame and all of the
   * frames invoked by the current frame from the call stack.
   *
   * If you want to erase additional **caller** frames (because the code that calls the callback is
   * not the direct call site from user code), you can specify an additional number of frames to erase
   * using the `extra` parameter.
   */
  entryPoint<T>(
    this: void,
    callback: () => T,
    options?: { extra?: number; stack?: Stack }
  ): T;
}

let PickedStack: StackStatics;

if (isDebug()) {
  class ParsedStack {
    static empty() {
      return new ParsedStack("", "", "", []);
    }

    static parse({ stack }: { stack: string }) {
      const parsed = new StackTracey(stack);
      const frames = parsed.items;

      if (frames.length === 0) {
        return new ParsedStack(stack, stack, "", []);
      }

      const first = frames[0].beforeParse;
      const lines = stack.split("\n");

      const offset = lines.findIndex((line) => line.trim() === first);

      if (offset === -1) {
        throw Error(
          `An assumption was incorrect: A line that came from StackTracey cannot be found in the original trace.\n\n== Stack ==\n\n${stack}\n\n== Line ==\n\n${first}`
        );
      }

      // the header is all of the lines before the offset
      const header = lines.slice(0, offset).join("\n");
      const rest = lines.slice(offset).join("\n");

      return new ParsedStack(
        stack,
        header,
        rest,
        frames.map((f) => StackFrame.from(parsed, f))
      );
    }

    readonly #source: string;
    readonly #header: string;
    readonly #rest: string;
    readonly #frames: readonly StackFrame[];

    private constructor(
      source: string,
      header: string,
      rest: string,
      frames: readonly StackFrame[]
    ) {
      this.#source = source;
      this.#header = header;
      this.#rest = rest;
      this.#frames = frames;
    }

    replaceFrames(stack: ParsedStack) {
      return new ParsedStack(
        this.#source,
        this.#header,
        stack.#rest,
        stack.#frames
      );
    }

    get header(): string {
      return this.#header;
    }

    get entries(): readonly StackFrame[] {
      return this.#frames;
    }

    /**
     * The formatted stack trace, suitable to be attached to `error.stack`.
     */
    get stack() {
      return `${this.#header}\n${this.#rest}`;
    }

    slice(n: number): ParsedStack {
      const rest = this.#rest.split("\n").slice(n).join("\n");
      return new ParsedStack(
        this.#source,
        this.#header,
        rest,
        this.#frames.slice(n)
      );
    }
  }

  class DebugStack implements Stack {
    static create(this: void, internal = 0): DebugStack {
      if ("captureStackTrace" in Error) {
        const err = {} as { stack: string };
        Error.captureStackTrace(err, DebugStack.create);
        return DebugStack.fromStack(err.stack).slice(internal);
      } else {
        const stack = Error(
          "An error created in the internals of Stack.create"
        ).stack;
        return DebugStack.fromStack(verified(stack, hasType("string"))).slice(
          internal + 1
        );
      }
    }

    static fromCaller(this: void, internal = 0): DebugStack {
      // Remove *this* `fromCaller` frame from the stack *and* the caller's frame
      return DebugStack.create(internal + 2);
    }

    static fromStack(stack: string): DebugStack {
      return new DebugStack(ParsedStack.parse({ stack }));
    }

    /**
     * Replace the stack frames in the specified error with the stack frames from the specified stack,
     * but leave the header from the specified error.
     *
     * If the error is not an Error with a stack, this function does nothing.
     */
    static replaceFrames(error: unknown, fromStack: DebugStack): void {
      if (isErrorWithStack(error)) {
        const errorStack = DebugStack.from(error);
        errorStack.replaceFrames(fromStack);
        error.stack = errorStack.stack;
      }
    }

    static from(error: ErrorWithStack): DebugStack;
    static from(error: unknown): DebugStack | null;
    static from(error: unknown): DebugStack | null {
      if (isErrorWithStack(error)) {
        return new DebugStack(ParsedStack.parse(error));
      } else {
        return null;
      }
    }

    static describeCaller(internal = 0): string {
      return DebugStack.callerFrame(internal + 1)?.display ?? "";
    }

    static EMPTY = new DebugStack(ParsedStack.empty());

    static description(
      args: DescriptionArgs & {
        fromUser?: string | DescriptionDetails | Description;
      },
      internal = 0
    ): Description {
      if (isDebug()) {
        const stack = DebugStack.fromCaller(internal + 1);

        if (args.fromUser === undefined || typeof args.fromUser === "string") {
          return Description.from({ ...args, stack });
        } else if (Description.is(args.fromUser)) {
          return args.fromUser;
        } else {
          return Description.from({ ...args, stack });
        }
      } else {
        return Description.from({ ...args, stack: DebugStack.EMPTY });
      }
    }

    static callerFrame(internal = 0): StackFrame | undefined {
      return DebugStack.fromCaller(internal + 1).caller;
    }

    static entryPoint<T>(
      callback: () => T,
      {
        extra = 0,
        stack = Stack.create(1 + extra),
      }: { extra?: number; stack?: Stack } = {}
    ): T {
      try {
        return callback();
      } catch (e) {
        const errorStack = Stack.from(e);

        if (errorStack) {
          Stack.replaceFrames(e, stack);
        }
        throw e;
      }
    }

    #parsed: ParsedStack;

    constructor(parsed: ParsedStack) {
      this.#parsed = parsed;
    }

    get entries(): readonly StackFrame[] {
      return this.#parsed.entries;
    }

    get caller(): StackFrame | undefined {
      return this.#parsed.entries[0];
    }

    get header(): string {
      return this.#parsed.header;
    }

    /**
     * The formatted stack trace, suitable to be attached to `error.stack`.
     */
    get stack(): string {
      return this.#parsed.stack;
    }

    /**
     * Replace the stack frames with the current Stack with the frames from the given Stack, but keep
     * the same header.
     */
    replaceFrames(stack: DebugStack) {
      return new DebugStack(this.#parsed.replaceFrames(stack.#parsed));
    }

    slice(n: number): DebugStack {
      if (n === 0) {
        return this;
      } else {
        return new DebugStack(this.#parsed.slice(n));
      }
    }
  }

  PickedStack = DebugStack;

  class StackFrame {
    static from(stack: StackTracey, frame: StackTracey.Entry): StackFrame {
      return new StackFrame(stack, frame, null);
    }

    #stack: StackTracey;
    #frame: StackTracey.Entry;
    #reified: StackTracey.Entry | null;

    private constructor(
      stack: StackTracey,
      frame: StackTracey.Entry,
      reified: StackTracey.Entry | null
    ) {
      this.#stack = stack;
      this.#frame = frame;
      this.#reified = reified;
    }

    #reify(): StackTracey.Entry {
      let reified = this.#reified;

      if (!reified) {
        this.#reified = reified = this.#stack.withSource(this.#frame);
      }

      return reified;
    }

    get action(): string {
      return this.#reify().callee;
    }

    get loc(): { line: number; column?: number } | undefined {
      const entry = this.#reify();

      if (entry.line === undefined) {
        return undefined;
      }

      return { line: entry.line, column: entry.column };
    }

    get debug(): StackTracey.Entry {
      return this.#reify();
    }

    get link() {
      const module = describeModule(this.#reify().file);
      return module.display({ loc: this.loc });
    }

    get display() {
      const module = describeModule(this.#reify().file);
      return module.display({ action: this.action, loc: this.loc });
    }
  }

  function isErrorWithStack(error: unknown): error is ErrorWithStack {
    return (
      isObject(error) &&
      error instanceof Error &&
      typeof error.stack === "string"
    );
  }
} else {
  /**
   * A stub implementation of the `Stack` infrastructure that doesn't do anything.
   */
  class ProdStack implements Stack {
    static EMPTY = new ProdStack();

    static create(this: void): Stack {
      return ProdStack.EMPTY;
    }

    static fromStack(this: void): Stack {
      return ProdStack.EMPTY;
    }

    static from(error: ErrorWithStack): Stack;
    static from(error: unknown): Stack | null;
    static from(): Stack | null {
      return ProdStack.EMPTY;
    }

    static replaceFrames(): void {
      return;
    }

    static describeCaller(): string {
      return "";
    }

    static description(
      args: DescriptionArgs & {
        fromUser?: string | DescriptionDetails | Description;
      }
    ): Description {
      return Description.from({ ...args, stack: ProdStack.EMPTY });
    }

    static callerFrame(): StackFrame | undefined {
      return undefined;
    }

    static fromCaller(): Stack {
      return ProdStack.EMPTY;
    }

    static entryPoint<T>(callback: () => T): T {
      return callback();
    }

    readonly caller: StackFrame | undefined = undefined;
    readonly stack: string = "";
  }

  PickedStack = ProdStack;
}

export const Stack: StackStatics = PickedStack;
export const entryPoint = PickedStack.entryPoint;

/** This should be convertable to something like Description.EMPTY in prod builds  */
export const descriptionFrom = PickedStack.description;

export const callerStack = PickedStack.fromCaller;
