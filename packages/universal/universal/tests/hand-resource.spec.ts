import "@starbeam/runtime";

import type { Reactive } from "@starbeam/interfaces";
import { CachedFormula, Cell } from "@starbeam/reactive";
import { LIFETIME } from "@starbeam/runtime";
import { describe, expect, test } from "vitest";

describe("A hand-rolled resource", () => {
  test("works", () => {
    const channelName = Cell("default");
    const resourceOwner = {};

    function Channel(channelName: Reactive<string>) {
      const output = Cell(null as string | null);
      const state: {
        finalized: boolean;
        cell: Cell<string | null>;
        channel: string | null;
        counts: { init: number; cleanup: number };
      } = {
        finalized: false,
        cell: output,
        channel: null,
        counts: { init: 0, cleanup: 0 },
      };

      function cleanup(): void {
        state.channel = null;
        state.counts.cleanup++;
        state.cell.current = null;
      }

      const formula = CachedFormula(() => {
        if (state.channel) {
          cleanup();
        }

        if (state.counts.init === 0) {
          LIFETIME.on.cleanup(resourceOwner, () => {
            cleanup();
            state.finalized = true;
          });
        }

        if (!state.finalized) {
          state.channel = channelName.current;
          state.cell.current = channelName.current.toUpperCase();
          state.counts.init++;
        }

        return state.cell;
      });

      const resource = CachedFormula(() => {
        return formula.current.current;
      });
      return { resource, state };
    }

    const { resource: channel, state } = Channel(channelName);

    expect(channel.current).toBe("DEFAULT");
    expect(state.counts.cleanup).toBe(0);
    expect(state.counts.init).toBe(1);
    expect(state.finalized).toBe(false);

    expect(channel.current).toBe("DEFAULT");
    expect(state.counts.cleanup).toBe(0);
    expect(state.counts.init).toBe(1);
    expect(state.finalized).toBe(false);

    channelName.set("newname");
    expect(channel.current).toBe("NEWNAME");
    expect(state.counts.cleanup).toBe(1);
    expect(state.counts.init).toBe(2);
    expect(state.finalized).toBe(false);

    LIFETIME.finalize(resourceOwner);
    expect(channel.current).toBe(null);
    expect(state.counts.cleanup).toBe(2);
    expect(state.counts.init).toBe(2);
    expect(state.finalized).toBe(true);

    channelName.set("newername");
    expect(channel.current).toBe(null);
    expect(state.counts.cleanup).toBe(2);
    expect(state.counts.init).toBe(2);
    expect(state.finalized).toBe(true);
  });
});
