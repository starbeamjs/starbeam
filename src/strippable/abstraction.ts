import type { UnsafeAny } from "./wrapper";

export const FRAMES_TO_REMOVE = 3;
const FRAME_START = "    at ";

export let CURRENT_FRAMES_TO_REMOVE: number | null = FRAMES_TO_REMOVE;

export class Abstraction {
  static default(): Abstraction {
    return new Abstraction(null, FRAMES_TO_REMOVE);
  }

  static start(): number | null {
    return ABSTRACTION.#start(2);
  }

  static end(start: number | null, error: Error): never;
  static end(start: number | null): void;
  static end(start: number | null, error?: Error): void {
    return ABSTRACTION.#end(start, error);
  }

  static #stack(frames: number, message: string): Error {
    let start = ABSTRACTION.#start(frames);

    try {
      throw Error(message);
    } catch (e) {
      return ABSTRACTION.#error(start, e as Error);
    }
  }

  static throw(message: string): never {
    throw Abstraction.#stack(2, message);
  }

  static wrap<T>(callback: () => T): T {
    // One frame for .wrap() and one frame for the call to the callback passed
    // to .wrap().
    let start = ABSTRACTION.#start(3);

    try {
      let result = callback();
      ABSTRACTION.#end(start);
      return result;
    } catch (e) {
      throw ABSTRACTION.#error(start, e as Error);
    }
  }

  #currentFrames: number | null;
  readonly #toRemove: number;

  private constructor(currentFrames: number | null, toRemove: number) {
    this.#currentFrames = currentFrames;
    this.#toRemove = toRemove;
  }

  #start(frames: number): number | null {
    let prev = this.#currentFrames;

    if (this.#currentFrames === null) {
      this.#currentFrames = this.#toRemove;
    } else {
      this.#currentFrames += frames;
    }

    return prev;
  }

  #end(prevFrames: number | null, error: Error): never;
  #end(prevFrames: number | null): void;
  #end(prevFrames: number | null, error?: Error): void;
  #end(prevFrames: number | null, error?: Error): void {
    let filtered = this.#error(prevFrames, error);

    if (filtered) {
      throw filtered;
    }
  }

  #error(prevFrames: number | null): void;
  #error(prevFrames: number | null, error: Error): Error;
  #error(prevFrames: number | null, error?: Error): Error | void;
  #error(prevFrames: number | null, error?: Error): Error | void {
    // Only filter once, at the top
    if (prevFrames !== null) {
      return error;
    }

    let framesToFilter = this.#currentFrames;

    if (framesToFilter === null) {
      throw Error(`Unexpected: unbalanced start and end in Abstraction`);
    }

    this.#currentFrames = prevFrames;

    if (error) {
      return this.#filter(framesToFilter, error);
    }
  }

  #filter(currentFrames: number, error: Error): Error {
    let filteredError: Error = error as UnsafeAny;

    if (error.stack === undefined) {
      throw Error(`Unexpected: missing error.stack`);
    }

    let lines = error.stack.split("\n");

    let removed = 0;

    let filtered: string[] = [];

    for (let line of lines) {
      if (!line.startsWith(FRAME_START)) {
        filtered.push(line);
      } else if (removed++ >= currentFrames) {
        filtered.push(line);
      }
    }

    filteredError.stack = filtered.join("\n");
    return filteredError;
  }
}

const ABSTRACTION = Abstraction.default();
