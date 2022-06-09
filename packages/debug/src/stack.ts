import { hasType, isObject, verified } from "@starbeam/verify";
import StackTracey from "stacktracey";

import {
  type CreateDescription,
  type DescriptionArgs,
  Description,
} from "./description/reactive-value.js";
import {
  type ImplementationDetails,
  ImplementationDescription,
} from "./description/reactive-value.js";
import { describeModule } from "./module.js";

export class ParsedStack {
  static empty() {
    return new ParsedStack("", "", []);
  }

  static parse({ stack }: { stack: string }) {
    const parsed = new StackTracey(stack);
    const frames = parsed.items;

    if (frames.length === 0) {
      return new ParsedStack(stack, stack, []);
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

    return new ParsedStack(
      stack,
      header,
      frames.map((f) => StackFrame.from(parsed, f))
    );
  }

  readonly #source: string;
  readonly #header: string;
  readonly #frames: readonly StackFrame[];

  private constructor(
    source: string,
    header: string,
    frames: readonly StackFrame[]
  ) {
    this.#source = source;
    this.#header = header;
    this.#frames = frames;
  }

  get entries(): readonly StackFrame[] {
    return this.#frames;
  }

  slice(n: number): ParsedStack {
    return new ParsedStack(this.#source, this.#header, this.#frames.slice(n));
  }
}

export class Stack {
  static create(this: void, internal = 0): Stack {
    if ("captureStackTrace" in Error) {
      const err = {} as { stack: string };
      Error.captureStackTrace(err, Stack.create);
      return Stack.fromStack(err.stack).slice(internal);
    } else {
      const stack = Error(
        "An error created in the internals of Stack.create"
      ).stack;
      return Stack.fromStack(verified(stack, hasType("string"))).slice(
        internal + 1
      );
    }
  }

  static fromStack(stack: string): Stack {
    return new Stack(ParsedStack.parse({ stack }));
  }

  static from(error: ErrorWithStack): Stack;
  static from(error: unknown): Stack | null;
  static from(error: unknown): Stack | null {
    if (isErrorWithStack(error)) {
      return new Stack(ParsedStack.parse(error));
    } else {
      return null;
    }
  }

  static fromHere(internal = 0): Stack {
    // Remove *this* `fromHere` frame from the stack
    return Stack.create(internal).slice(1);
  }

  static describeCaller(internal = 0): string {
    return Stack.callerFrame(internal + 1)?.display ?? "";
  }

  static empty(): Stack {
    return new Stack(ParsedStack.empty());
  }

  static marker(
    description:
      | ImplementationDescription
      | (ImplementationDetails & CreateDescription),
    internal = 0
  ): ImplementationDescription {
    if (Description.is(description)) {
      return description;
    }

    const stack = Stack.fromCaller(internal + 1);
    return ImplementationDescription.from({ ...description, stack });
  }

  static description(
    name?: string | DescriptionArgs,
    internal = 0
  ): DescriptionArgs {
    if (name !== undefined && typeof name !== "string") {
      return name;
    }

    const stack = Stack.fromCaller(internal + 1);

    if (name === undefined) {
      return { stack };
    } else {
      return { name, stack };
    }
  }

  static callerFrame(internal = 0): StackFrame | undefined {
    return Stack.fromCaller(internal + 1).caller;
  }

  static fromCaller(internal = 0): Stack {
    // Remove *this* `fromCaller` frame from the stack *and* the caller's frame
    return Stack.create(internal + 2);
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

  slice(n: number): Stack {
    if (n === 0) {
      return this;
    } else {
      return new Stack(this.#parsed.slice(n));
    }
  }
}

export class StackFrame {
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

  get display() {
    const module = describeModule(this.#reify().file);
    return module.display({ action: this.action, loc: this.loc });
  }
}

type ErrorWithStack = Error & { stack: string };

export function isErrorWithStack(error: unknown): error is ErrorWithStack {
  return (
    isObject(error) && error instanceof Error && typeof error.stack === "string"
  );
}
