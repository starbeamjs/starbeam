import { callerStack } from "@starbeam/debug";
import type {
  CellTag,
  Runtime as IRuntime,
  Stack,
  Tagged,
  Timestamp,
} from "@starbeam/interfaces";
import { defineRuntime } from "@starbeam/reactive";
import { TIMELINE } from "../../runtime";

type Timeline = typeof TIMELINE;

class Runtime implements IRuntime {
  static default(): Runtime {
    return new Runtime(TIMELINE);
  }

  static timeline(timeline: Timeline): Runtime {
    return new Runtime(timeline);
  }

  readonly #timeline: Timeline;

  private constructor(timeline: Timeline) {
    this.#timeline = timeline;
  }

  callerStack(): Stack {
    return callerStack();
  }

  didConsumeCell(cell: Tagged<CellTag>, caller: Stack): void {
    this.#timeline.didConsumeCell(cell, caller);
  }

  bumpCell(cell: CellTag, caller: Stack): Timestamp {
    return this.#timeline.bump(cell, caller);
  }
}

export const RUNTIME = Runtime.default();

defineRuntime(RUNTIME);
