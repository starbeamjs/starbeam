import type { CellTag, Reactive } from "@starbeam/interfaces";
import { PUBLIC_TIMELINE } from "@starbeam/runtime";

interface RenderOptions<T> {
  readonly render: (value: T, tag: CellTag) => void;
  readonly schedule: (callback: () => void) => void;
}

export function render<T>(value: Reactive<T>, options: RenderOptions<T>) {
  let scheduled = false;

  PUBLIC_TIMELINE.on.change(value, (tag) => {
    if (scheduled) return;
    scheduled = true;

    options.schedule(() => {
      options.render(value.current, tag);
      scheduled = false;
    });
  });
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const { Cell } = await import("@starbeam/reactive");

  class Last {
    #scheduled?: undefined | (() => void);
    #rendered?: number | undefined;
    #flushCount = 0;

    schedule(callback: () => void) {
      this.#scheduled = callback;
    }

    rendered(value: number | undefined) {
      this.#rendered = value;
    }

    flush():
      | { status: "flushed"; value: number | undefined; flushed: number }
      | { status: "empty" } {
      if (this.#scheduled === undefined) return { status: "empty" };
      this.#scheduled();
      this.#scheduled = undefined;
      this.#flushCount++;
      return {
        status: "flushed",
        value: this.#rendered,
        flushed: this.#flushCount,
      };
    }

    expect(value: number | undefined) {
      expect(this.#rendered).toBe(value);
    }
  }

  test("render", ({ expect }) => {
    const cell = Cell(0);
    const last = new Last();

    render(cell, {
      render: (value) => {
        last.rendered(value);
      },
      schedule,
    });

    expect(last.flush()).toEqual({ status: "empty" });

    cell.set(1);
    expect(last.flush()).toEqual({ status: "flushed", value: 1, flushed: 1 });

    cell.set(1);
    expect(last.flush()).toEqual({ status: "empty" });

    cell.set(2);
    expect(last.flush()).toEqual({ status: "flushed", value: 2, flushed: 2 });

    cell.set(3);
    cell.set(4);
    cell.set(5);

    expect(last.flush()).toEqual({ status: "flushed", value: 5, flushed: 3 });

    function schedule(callback: () => void) {
      last.schedule(callback);
    }
  });
}
