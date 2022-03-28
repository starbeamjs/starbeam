import { Frame } from "./frame.js";
import { assert, isObject } from "./utils.js";

const FRAME_START = "    at ";

export class ParsedStack {
  static parse(source: string): ParsedStack {
    let lines = source.split("\n");
    let headerDone = false;

    let headerLines = [];
    let stackLines = [];

    for (let line of lines) {
      if (headerDone) {
        stackLines.push(line);
      } else {
        if (line.startsWith(FRAME_START)) {
          headerDone = true;
          stackLines.push(line);
        } else {
          headerLines.push(line);
        }
      }
    }

    if (stackLines.length === 0) {
      throw Error(
        `An assumption was incorrect: Cannot parse an error's stack because the stack had no frames.\n\n== Stack ==\n\n${source}`
      );
    }

    return new ParsedStack(
      source,
      headerLines.join("\n"),
      stackLines.map(Frame.parse)
    );
  }

  readonly #source: string;
  readonly #header: string;
  readonly #frames: readonly Frame[];

  private constructor(
    source: string,
    header: string,
    frames: readonly Frame[]
  ) {
    this.#source = source;
    this.#header = header;
    this.#frames = frames;
  }

  withHeader(header: string): ParsedStack {
    return new ParsedStack(
      sourceFor(header, this.#frames),
      header,
      this.#frames
    );
  }

  get source(): string {
    return this.#source;
  }

  get header(): string {
    return this.#header;
  }

  get frames(): string[] {
    return this.#frames.map(Frame.original);
  }

  get first(): Frame {
    return this.#frames[0];
  }

  get stack(): string {
    return this.#source;
  }

  nth(frame: number): Frame | null {
    if (frame >= this.#frames.length) {
      return null;
    }

    return this.#frames[frame];
  }

  slice(n: number): ParsedStack {
    const frames = this.#frames.slice(n);

    assert(
      frames.length > 0,
      `Cannot remove ${n} frames from stack because the stack only had ${
        this.#frames.length
      } frames\n\n== Stack ==\n\nCannot parse an error's stack because the stack had no frames.\n\n== Stack ==\n\n${
        this.#source
      }`
    );

    return new ParsedStack(
      sourceFor(this.#header, frames),
      this.#header,
      frames
    );
  }
}

function sourceFor(header: string, frames: readonly Frame[]): string {
  return `${header}\n${frames.map(Frame.original).join("\n")}`;
}

type ErrorWithStack = Error & { stack: string };

export function isErrorWithStack(error: unknown): error is ErrorWithStack {
  return (
    isObject(error) && error instanceof Error && typeof error.stack === "string"
  );
}

export class Stack {
  /**
   * Call a callback, and if the callback throws an exception, remove the current
   * frame and all of the frames invoked by the current frame from the call stack.
   *
   * In practice, this erases the abstraction from the call stack.
   *
   * If you want to erase additional **caller** frames (because the code that
   * calls the callback is not the direct call site from user code), you can
   * specify an additional number of frames to erase using the `extra` parameter.
   */
  static entryPoint<T>(callback: () => T): T {
    const caller = Stack.fromCaller(1);

    try {
      return callback();
    } catch (e) {
      Stack.updateError(e, (e) => {
        e.stack = caller.withHeader(Stack.from(e)).display;
      });

      throw e;
    }
  }

  static from(error: ErrorWithStack): Stack;
  static from(error: unknown): Stack | null;
  static from(error: unknown): Stack | null {
    if (isErrorWithStack(error)) {
      return new Stack(ParsedStack.parse(error.stack));
    } else {
      return null;
    }
  }

  static updateError<T extends ErrorWithStack>(
    error: T,
    callback: (error: T) => void
  ): T;
  static updateError<T>(error: T, callback: (error: ErrorWithStack) => void): T;
  static updateError<T>(
    error: T,
    callback: (error: ErrorWithStack) => void
  ): T {
    if (isErrorWithStack(error)) {
      callback(error);
    }

    return error;
  }

  static create(internal = 0): Stack {
    try {
      throw Error("An error created in the internals of Stack.caller");
    } catch (e) {
      assert(
        isErrorWithStack(e),
        `An Error created in the internals of Stack.caller wasn't an Error instance when caught.`
      );

      // Remove *this* `create` frame from the stack
      return Stack.from(e).slice(1 + internal);
    }
  }

  static fromHere(internal = 0): Stack {
    // Remove *this* `fromHere` frame from the stack
    return Stack.create(internal).slice(1);
  }

  static describeCaller(internal = 0): string {
    const stack = Stack.fromCaller(internal + 1);
    return stack.caller.display;
  }

  static fromCaller(internal = 0): Stack {
    // Remove *this* `fromCaller` frame from the stack *and* the caller's frame
    return Stack.create(internal).slice(2);
  }

  static callerFrame(): Frame {
    // Remove *this* `callerFrame` frame from the stack *and* the caller's frame, then
    return Stack.fromCaller(1).caller;
  }

  readonly #parsed: ParsedStack;

  constructor(parsed: ParsedStack) {
    this.#parsed = parsed;
  }

  withHeader(header: string | Stack): Stack {
    if (typeof header === "string") {
      return new Stack(this.#parsed.withHeader(header));
    } else {
      return new Stack(this.#parsed.withHeader(header.#parsed.header));
    }
  }

  get caller(): Frame {
    return this.#parsed.first;
  }

  get display(): string {
    return this.#parsed.stack;
  }

  nth(frame: number): Frame | null {
    return this.#parsed.nth(frame);
  }

  slice(n: number): Stack {
    return new Stack(this.#parsed.slice(n));
  }
}
