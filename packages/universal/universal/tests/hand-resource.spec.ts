import "@starbeam/runtime";

import type { Reactive } from "@starbeam/interfaces";
import { CachedFormula, Cell, type FormulaFn } from "@starbeam/reactive";
import { LIFETIME } from "@starbeam/runtime";
import {
  assimilateResource,
  getRunInstance,
  ResourceConstructor,
  ResourceState,
  updateResource,
} from "@starbeam/universal";
import { describe, expect, test } from "vitest";

describe("A hand-rolled resource", () => {
  test("based on formula", () => {
    const channelName = Cell("default");
    const resourceOwner = {};

    function Channel(channelName: Reactive<string>): {
      resource: FormulaFn<string | null>;
      state: {
        finalized: boolean;
        cell: Cell<string | null>;
        channel: string | null;
        counts: { init: number; cleanup: number };
      };
    } {
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

  test("using Resource runs", () => {
    const channelName = Cell("default");
    const resourceOwner = {};

    function Channel(channelName: Reactive<string>): {
      resource: FormulaFn<string | null>;
      state: TestState;
    } {
      const output = Cell(null as string | null);

      const update = updateResource<
        TestInstance,
        TestMetadata & { output: Cell<string | null> }
      >((run, metadata) => {
        run.on.cleanup((metadata) => {
          metadata.channel = null;
          metadata.counts.cleanup++;
        });

        metadata.channel = channelName.current;
        metadata.output.current = channelName.current.toUpperCase();
        metadata.counts.init++;
        return metadata.output;
      });

      const state = ResourceState.create(
        update,
        {
          counts: { init: 0, cleanup: 0 },
          output,
          channel: null as null | string,
        },
        resourceOwner
      );

      const formula = CachedFormula(() => {
        return state.nextRun();
      });

      const resource = CachedFormula(() => {
        return getRunInstance(formula)?.current ?? null;
      });
      return { resource, state };
    }

    const { resource: channel, state } = Channel(channelName);
    const { metadata } = state;

    assert({ channelName: "DEFAULT", cleanup: 0, init: 1, isFinalized: false });
    // make sure that polling the resource again doesn't change anything
    assert({ channelName: "DEFAULT", cleanup: 0, init: 1, isFinalized: false });

    channelName.set("newname");
    assert({ channelName: "NEWNAME", cleanup: 1, init: 2, isFinalized: false });

    LIFETIME.finalize(resourceOwner);
    assert({ channelName: "NEWNAME", cleanup: 2, init: 2, isFinalized: true });

    console.log("setting channelName");
    channelName.set("newername");
    console.log("set channelName");
    assert({ channelName: "NEWNAME", cleanup: 2, init: 2, isFinalized: true });

    function assert({
      channelName,
      cleanup,
      init,
      isFinalized,
    }: {
      channelName: string | null;
      cleanup: number;
      init: number;
      isFinalized: boolean;
    }): void {
      expect(channel.current, "channel name").toBe(channelName);
      expect(metadata.counts.cleanup, "cleanup count").toBe(cleanup);
      expect(metadata.counts.init, "init count").toBe(init);
      expect(state.isFinalized, "is finalized").toBe(isFinalized);
    }
  });

  test("using ResourceConstructor", () => {
    const channelName = Cell("default");
    const resourceOwner = {};

    function Channel(channelName: Reactive<string>): {
      resource: Reactive<string | undefined>;
      metadata: TestMetadata;
    } {
      const metadata = {
        counts: { init: 0, cleanup: 0 },
        channel: null as null | string,
      } satisfies TestMetadata;

      const resource = ResourceConstructor(metadata, (run, metadata) => {
        run.on.cleanup((metadata) => {
          metadata.channel = null;
          metadata.counts.cleanup++;
        });

        metadata.channel = channelName.current;
        const instance = Cell(
          channelName.current.toUpperCase(),
          `instance${metadata.counts.init}`
        );
        metadata.counts.init++;

        return instance;
      }).create({ within: resourceOwner });

      return {
        resource: resource.instance(assimilateResource),
        metadata,
      };
    }

    const { resource: channel, metadata } = Channel(channelName);

    assert({ channelName: "DEFAULT", cleanup: 0, init: 1, isFinalized: false });
    // make sure that polling the resource again doesn't change anything
    assert({ channelName: "DEFAULT", cleanup: 0, init: 1, isFinalized: false });

    channelName.set("newname");
    assert({ channelName: "NEWNAME", cleanup: 1, init: 2, isFinalized: false });

    LIFETIME.finalize(resourceOwner);
    assert({ channelName: "NEWNAME", cleanup: 2, init: 2, isFinalized: true });

    channelName.set("newername");
    assert({ channelName: "NEWNAME", cleanup: 2, init: 2, isFinalized: true });

    function assert({
      channelName,
      cleanup,
      init,
    }: {
      channelName: string | undefined;
      cleanup: number;
      init: number;
      isFinalized: boolean;
    }): void {
      expect(channel.current, "channel name").toBe(channelName);
      expect(metadata.counts.cleanup, "cleanup count").toBe(cleanup);
      expect(metadata.counts.init, "init count").toBe(init);
    }
  });

  test("assimilating reactives", () => {
    const lifetime = {};
    const resource = ResourceConstructor(null, () => {
      return Cell(0);
    }).create({ within: lifetime });

    const instance = resource.instance((cell) => cell.current);

    expect(instance.current).toBe(0);
  });

  test("using a resource in a resource", () => {
    const lifetime = {};
    const channelName = Cell("channel:default");
    const socketName = Cell("socket:default");

    const Socket = ResourceConstructor({ instance: 0 }, ({ on }, meta) => {
      meta.instance++;
      const connection = { name: socketName.current, socket: "connected" };

      on.cleanup(() => {
        connection.socket = "disconnected";
      });

      return connection;
    });

    const socketInstance = Socket.create({
      within: lifetime,
    });

    const Channel = ResourceConstructor(
      { instance: 0, socket: socketInstance },
      ({ use }, meta) => {
        meta.instance++;
        const socketInstance = use(meta.socket);
        const socket = socketInstance.instance();
        const socketMeta = socketInstance.metadata();
        const channel = `${socket.current.name}:${channelName.current}`;

        const connection = {
          name: socketName.current,
          messages: Cell(0, "messages"),
        };

        return {
          channel,
          get socketMeta() {
            return socketMeta.current;
          },
          get messages() {
            return connection.messages.current;
          },
          send: () => {
            connection.messages.current++;
          },
        };
      }
    );

    const channelInstance = Channel.create({
      within: lifetime,
    });

    const channel = channelInstance.instance();
    const meta = channelInstance.metadata();

    expect(channel.current.messages).toBe(0);
    expect(meta.current.instance).toBe(1);
    expect(channel.current.socketMeta.instance).toBe(1);

    channelName.set("newname");
    expect(channel.current.messages).toBe(0);
    expect(meta.current.instance).toBe(2);
    expect(channel.current.socketMeta.instance).toBe(1);
  });

  test("assimilating resource constructors", () => {
    const lifetime = {};
    const channelName = Cell("default");

    const First = ResourceConstructor(null, () => {
      // intentionally consume channelName in the constructor
      const channel = Cell(channelName.current);
      const counter = Cell(0);

      return {
        get channel() {
          return `${counter.current} ${channel.current}`;
        },
        increment: () => {
          counter.current++;
        },
      };
    });

    const resource = ResourceConstructor(null, () => First).create({
      within: lifetime,
    });
  });
});

type TestState = ResourceState<TestInstance, TestMetadata>;
type TestInstance = Cell<string | null>;

interface TestMetadata {
  channel: string | null;
  counts: { init: number; cleanup: number };
}
