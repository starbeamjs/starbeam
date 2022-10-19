/// <reference types="node" />

import type {
  DescriptionArgs,
  DescriptionDetails,
  ReactiveId,
  Stack as StackProtocol,
  StackFrame,
  StackFrameDisplayOptions,
  // eslint-disable-next-line import/no-duplicates
} from "@starbeam/interfaces";
// eslint-disable-next-line import/no-duplicates
import type * as interfaces from "@starbeam/interfaces";
import { getID } from "@starbeam/shared";
import { hasType, isObject, verified } from "@starbeam/verify";
import { default as StackTracey } from "stacktracey";

// eslint-disable-next-line import/no-cycle
import { Description } from "./description/impl.js";
import { inspector } from "./inspect/inspect-support.js";
import { describeModule } from "./module.js";

type ErrorWithStack = Error & { stack: string };

export interface StackStatics {
  readonly EMPTY: StackProtocol;

  create(this: void, internal?: number): StackProtocol;
  fromStack(stack: string): StackProtocol;

  from(error: ErrorWithStack): StackProtocol;
  from(error: unknown): StackProtocol | null;

  id(
    this: void,
    description?: string | Description | { id: ReactiveId }
  ): ReactiveId;

  description(
    this: void,
    args: DescriptionArgs & {
      fromUser?:
        | string
        | DescriptionDetails
        | interfaces.Description
        | undefined;
    },
    internal?: number
  ): interfaces.Description;

  desc(
    type: interfaces.DescriptionType,
    fromUser?: string | DescriptionDetails | interfaces.Description | undefined,
    internal?: number | undefined
  ): interfaces.Description;

  fromCaller(this: void, internal?: number): StackProtocol;

  replaceFrames(error: unknown, fromStack: StackProtocol): void;

  /**
   * Erase an abstraction from the call stack so the test error points at the user code, rather than
   * the abstraction's code.
   *
   * Call a callback, and if the callback throws an exception, remove the current frame and all of the
   * frames invoked by the current frame from the call stack.
   *
   * If you want to erase additional **caller** frames (because the code that calls the callback is
   * not the direct call site from user code), you can specify an additional number of frames to erase
   * using the `internal` parameter.
   */
  entryPoint<T>(
    this: void,
    callback: () => T,
    options?: { internal?: number; stack?: StackProtocol }
  ): T;
}

let PickedStack: StackStatics;

if (import.meta.env.DEV) {
  Error.stackTraceLimit = Infinity;

  class ParsedStack {
    static empty() {
      return new ParsedStack("", "", "", []);
    }

    static parse({ stack }: { stack: string }) {
      const parsed = new StackTracey(stack);
      const frames = parsed.items;

      const [firstFrame] = frames;

      if (firstFrame === undefined) {
        return new ParsedStack(stack, stack, "", []);
      }

      const first = firstFrame.beforeParse;
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

    static {
      inspector(this, "ParsedStack").define((stack, debug) =>
        debug.struct({
          header: stack.#header,
          frames: stack.#frames.map((f) => f.parts().display()),
          rest: stack.#rest,
        })
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

  const REPLACED_ERRORS = new WeakSet<ErrorWithStack>();

  class DebugStack implements StackProtocol {
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
        errorStack.withReplacedFrames(fromStack);
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

    static EMPTY = new DebugStack(ParsedStack.empty());

    static description(
      args: DescriptionArgs & {
        fromUser?:
          | string
          | DescriptionDetails
          | interfaces.Description
          | undefined;
      },
      internal = 0
    ): interfaces.Description {
      const stack = DebugStack.fromCaller(internal + 1);
      const fromUser = args.fromUser;

      const api: string | interfaces.ApiDetails | undefined = args.api ?? {};

      if (typeof api !== "string" && api.package === undefined) {
        const starbeam = stack.caller?.starbeamCaller;

        if (starbeam) {
          api.package = starbeam.package;
          api.name = starbeam.name;
        }
      }

      if (fromUser === undefined || typeof fromUser === "string") {
        return Description.from({ ...args, stack });
      } else if (Description.is(fromUser)) {
        return fromUser.withId(args.id);
      } else {
        return Description.from({ ...args, stack });
      }
    }

    static desc(
      type: interfaces.DescriptionType,
      fromUser?:
        | string
        | DescriptionDetails
        | interfaces.Description
        | undefined,
      internal = 0
    ): interfaces.Description {
      return DebugStack.description(
        {
          type,
          fromUser,
        },
        internal + 1
      );
    }

    static id(
      this: void,
      description?: string | { id: ReactiveId }
    ): ReactiveId {
      if (description === undefined || typeof description === "string") {
        return getID();
      } else {
        return description.id;
      }
    }

    static callerFrame(internal = 0): StackFrame | undefined {
      return DebugStack.fromCaller(internal + 1).caller;
    }

    static entryPoint<T>(
      callback: () => T,
      {
        internal = 0,
        stack = DebugStack.create(1 + internal),
      }: { internal?: number; stack?: StackProtocol } = {}
    ): T {
      try {
        return callback();
      } catch (e) {
        if (isErrorWithStack(e) && !REPLACED_ERRORS.has(e)) {
          const errorStack = DebugStack.from(e);

          if (errorStack) {
            const updated = errorStack.withReplacedFrames(stack as DebugStack);
            e.stack = updated.stack;
            REPLACED_ERRORS.add(e);
          }
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
    withReplacedFrames(stack: DebugStack) {
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

  class StackFrame implements interfaces.StackFrame {
    static from(stack: StackTracey, frame: StackTracey.Entry): StackFrame {
      return new StackFrame(stack, frame, null);
    }

    static {
      inspector(this, "StackFrame").define((frame, debug) =>
        debug.struct({ original: frame.parts().display() })
      );
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

    get starbeamCaller():
      | { package: string; name?: string | undefined }
      | undefined {
      const frame = this.#reify();

      const pkg = frame.file.match(/(@starbeam\/[/]+)/);

      if (pkg) {
        return {
          package: pkg[1] as string,
          name: frame.callee === "" ? undefined : frame.callee,
        };
      }
    }

    get action(): string {
      return this.#reify().callee;
    }

    get loc(): { line: number; column?: number | undefined } | undefined {
      const entry = this.#reify();

      if (entry.line === undefined) {
        return undefined;
      }

      return { line: entry.line, column: entry.column };
    }

    get debug(): StackTracey.Entry {
      return this.#reify();
    }

    link(options?: StackFrameDisplayOptions): string {
      if (options?.complete) {
        return this.#stack.items.map((entry) => entry.beforeParse).join("\n");
      }

      const module = describeModule(this.#reify().file);
      return module.display({ loc: this.loc }, options);
    }

    fullStack(): string {
      return this.#stack.asTable();
    }

    display(options?: StackFrameDisplayOptions): string {
      const module = describeModule(this.#reify().file);
      return module.display({ action: this.action, loc: this.loc }, options);
    }

    parts(
      options?: StackFrameDisplayOptions | undefined
    ): interfaces.DisplayParts {
      const module = describeModule(this.#reify().file);
      return module.parts({ action: this.action, loc: this.loc }, options);
    }
  }
} else {
  /**
   * A stub implementation of the `Stack` infrastructure that doesn't do anything.
   */
  class ProdStack implements StackProtocol {
    static EMPTY = new ProdStack();

    static create(this: void): StackProtocol {
      return ProdStack.EMPTY;
    }

    static fromStack(this: void): StackProtocol {
      return ProdStack.EMPTY;
    }

    static from(error: ErrorWithStack): StackProtocol;
    static from(error: unknown): StackProtocol | null;
    static from(): StackProtocol | null {
      return ProdStack.EMPTY;
    }

    static replaceFrames(): void {
      return;
    }

    static description(
      args: DescriptionArgs & {
        fromUser?:
          | string
          | DescriptionDetails
          | interfaces.Description
          | undefined;
      }
    ): interfaces.Description {
      return Description.from({ ...args, stack: ProdStack.EMPTY });
    }

    static desc(
      type: interfaces.DescriptionType,
      fromUser?:
        | string
        | DescriptionDetails
        | interfaces.Description
        | undefined
    ): interfaces.Description {
      return ProdStack.description({
        type,
        stack: ProdStack.EMPTY,
        fromUser,
      });
    }

    static id(): ReactiveId {
      return getID();
    }

    static callerFrame(): StackFrame | undefined {
      return undefined;
    }

    static fromCaller(): StackProtocol {
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
export type Stack = interfaces.Stack;
export const entryPoint = PickedStack.entryPoint;

export function entryPointFn<F extends (...args: any[]) => any>(
  fn: F,
  options?: { stack: Stack }
): F {
  return ((...args: any[]) =>
    entryPoint(() => fn(...args), { internal: 1, ...options })) as F;
}

export function entryPoints<Funcs extends object>(
  funcs: Funcs,
  options?: { stack: Stack }
): Funcs {
  const result: Record<string, (...args: any[]) => any> = Object.create(null);

  for (const [key, fn] of Object.entries(funcs)) {
    if (typeof fn === "function") {
      result[key] = entryPointFn(fn, options);
    } else {
      result[key] = fn;
    }
  }

  return result as Funcs;
}

/** This should be convertable to something like Description.EMPTY in prod builds  */
export const descriptionFrom = PickedStack.description;
export const Desc = PickedStack.desc;

/**
 * If it isn't already removed, this should be convertable to getID in prod builds
 */
export const idFrom = PickedStack.id;

export const callerStack = PickedStack.fromCaller;

export function isErrorWithStack(error: unknown): error is ErrorWithStack {
  return (
    isObject(error) && error instanceof Error && typeof error.stack === "string"
  );
}
