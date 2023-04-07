// @vitest-environment jsdom

import reactive from "@starbeam/collections";
import type { Reactive } from "@starbeam/interfaces";
import { use, useProp, useReactive, useSetup } from "@starbeam/react";
import { CachedFormula, intoReactive } from "@starbeam/reactive";
import { Cell, Resource, type ResourceBlueprint } from "@starbeam/universal";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { beforeEach, describe, expect } from "@starbeam-workspace/test-utils";

import { Channel } from "./support/channel.js";

describe("useResource", () => {
  beforeEach(Channel.reset);

  testReact<{ name: string }, string | null | undefined>(
    "using useProp",
    async (root) => {
      const result = await root
        .expectHTML((message) => `<span>${message ?? "loading"}</span>`)
        .render(
          (state, props) => {
            const name = useProp(props.name);
            const message = use(ChannelResource(name));

            state.value(message);

            return react.fragment(html.span(message ?? "loading"));
          },
          { name: "test" }
        );

      function send(message: string): void {
        const latest = Channel.latest();

        if (latest === undefined) {
          expect(latest).not.toBeUndefined();
          return;
        }

        Channel.sendMessage(latest, message);
      }

      let channel = Channel.latest();
      expect(channel).not.toBeUndefined();

      expect(result.value).toBe(undefined);
      await result.act(() => {
        send("first message");
      });

      await result.rerender();
      expect(result.value).toEqual("first message");

      await result.act(() => {
        send("second message");
      });
      expect(result.value).toEqual("second message");

      await result.rerender({ name: "test2" });
      expect(channel?.isActive).toBe(false);

      channel = Channel.latest();
      expect(channel).not.toBeUndefined();
      expect(channel?.isActive).toBe(true);

      await result.act(() => {
        send("third message");
      });
      expect(result.value).toEqual("third message");

      result.unmount();
      expect(channel?.isActive).toBe(false);
    }
  );

  testReact<{ name: string }, string | null | undefined>(
    "using a dependency array",
    async (root) => {
      const result = await root
        .expectHTML((message) => `<span>${message ?? "loading"}</span>`)
        .render(
          (state, { name }) => {
            const message = use(() => ChannelResource(name), [name]);

            state.value(message);

            return react.fragment(html.span(message ?? "loading"));
          },
          { name: "test" }
        );

      function send(message: string): void {
        const latest = Channel.latest();

        if (latest === undefined) {
          expect(latest).not.toBeUndefined();
          return;
        }

        Channel.sendMessage(latest, message);
      }

      let channel = Channel.latest();
      expect(channel).not.toBeUndefined();

      expect(result.value).toBe(undefined);
      await result.act(() => {
        send("first message");
      });

      await result.rerender();
      expect(result.value).toEqual("first message");

      await result.act(() => {
        send("second message");
      });
      expect(result.value).toEqual("second message");

      await result.rerender({ name: "test2" });
      expect(channel?.isActive).toBe(false);

      channel = Channel.latest();
      expect(channel).not.toBeUndefined();
      expect(channel?.isActive).toBe(true);

      await result.act(() => {
        send("third message");
      });
      expect(result.value).toEqual("third message");

      result.unmount();
      expect(channel?.isActive).toBe(false);
      expect(Channel.latest()).toBe(undefined);
    }
  );

  testReact<{ name: string }, string | null | undefined>(
    "the resource is created when the component is mounted, and effects run",
    async (root) => {
      const result = await root
        .expectHTML((message) => `<span>${message ?? "loading"}</span>`)
        .render(
          (state, { name }) => {
            const message = use(() => ChannelResource(name), [name]);

            if (state.renderCount === 0) {
              expect(Channel.latest()).toBe(undefined);
            }

            state.value(message);

            return react.fragment(html.span(message ?? "loading"));
          },
          { name: "test" }
        );

      function send(message: string): void {
        const latest = Channel.latest();

        if (latest === undefined) {
          expect(latest).not.toBeUndefined();
          return;
        }

        Channel.sendMessage(latest, message);
      }

      let channel = Channel.latest();
      expect(channel).not.toBeUndefined();

      expect(result.value).toBe(undefined);
      await result.act(() => {
        send("first message");
      });

      await result.rerender();
      expect(result.value).toEqual("first message");

      await result.act(() => {
        send("second message");
      });
      expect(result.value).toEqual("second message");

      await result.rerender({ name: "test2" });
      expect(channel?.isActive).toBe(false);

      channel = Channel.latest();
      expect(channel).not.toBeUndefined();
      expect(channel?.isActive).toBe(true);

      await result.act(() => {
        send("third message");
      });
      expect(result.value).toEqual("third message");

      result.unmount();
      expect(channel?.isActive).toBe(false);
      expect(Channel.latest()).toBe(undefined);
    }
  );
});

describe("use", () => {
  testReact<
    unknown,
    | { channel: ChannelInfo | undefined; increment: () => void }
    | null
    | undefined
  >("using use() with dependencies", async (root, mode) => {
    ID = 0;

    const result = await root
      .expectHTML((state) =>
        state?.channel?.message
          ? `<span>${state?.channel.message}</span><button>++ ${state?.channel.id} ++</button>`
          : `<span>loading</span>`
      )
      .render(
        (state) => {
          const { name, increment } = useSetup(() => {
            const count = Cell(0, { description: `count` });

            const name = CachedFormula(() => `channel${count.current}`, {
              description: `channel-name`,
            });

            return {
              name,
              increment: () => {
                count.update((i) => i + 1);
              },
            };
          });

          const channel = use(() => {
            return SimpleChannel(name.current);
          }, [name]);

          state.value({ channel, increment });

          return useReactive(
            () =>
              channel?.message
                ? react.fragment(
                    html.span(),
                    html.button({ onClick: increment }, `++ ${channel.id} ++`)
                  )
                : html.span("loading"),
            "jsx"
          );
        },
        { name: "test" }
      );

    const channel = Channel.latest();
    expect(channel).not.toBeUndefined();

    const firstId = mode.match({ strict: () => 0, loose: () => 0 });

    expect(result.value?.channel).not.toBeUndefined();

    await result.act(() => {
      send("first message");
    });

    expect(result.value?.channel).toEqual({
      id: firstId,
      message: "first message",
    });

    await result.act(() => {
      send("second message");
    });

    expect(result.value?.channel).toEqual({
      id: firstId,
      message: "second message",
    });

    await result.act(() => {
      result.value?.increment();
    });
  });

  testReact<
    unknown,
    | { channel: ChannelInfo | undefined; increment: () => void }
    | null
    | undefined
  >("using resource() from useSetup()", async (root, mode) => {
    ID = 0;

    const result = await root
      .expectHTML((state) =>
        state?.channel?.message
          ? `<span>${state?.channel.message}</span><button>++ ${state?.channel.id} ++</button>`
          : `<span>loading</span>`
      )
      .render(
        (state) => {
          const { channel, increment } = useSetup(({ use }) => {
            const count = Cell(0, { description: `count` });

            const name = CachedFormula(() => `channel${count.current}`, {
              description: `channel-name`,
            });

            const channel = use(() => SimpleChannel(name.current));

            return {
              channel,
              increment: () => {
                count.update((i) => i + 1);
              },
            };
          });

          return useReactive(() => {
            state.value({ channel: channel.current, increment });
            const current = channel.current;
            return current && current.message
              ? react.fragment(
                  html.span(),
                  html.button({ onClick: increment }, `++ ${current.id} ++`)
                )
              : html.span("loading");
          }, "jsx");
        },
        { name: "test" }
      );

    const channel = Channel.latest();
    expect(channel).not.toBeUndefined();

    const firstId = mode.match({ strict: () => 1, loose: () => 0 });

    expect(result.value?.channel).not.toBeUndefined();

    await result.act(() => {
      send("first message");
    });

    expect(result.value?.channel).toEqual({
      id: firstId,
      message: "first message",
    });

    await result.act(() => {
      send("second message");
    });

    expect(result.value?.channel).toEqual({
      id: firstId,
      message: "second message",
    });

    await result.act(() => {
      result.value?.increment();
    });
  });
});

let ID = 0;

interface ChannelInfo {
  id: number;
  message: string | undefined;
}

function SimpleChannel(
  name: string
): ResourceBlueprint<ChannelInfo, undefined> {
  return Resource(({ on }) => {
    const state = reactive.object(
      {
        id: ID++,
        message: undefined as string | undefined,
      },
      "SimpleChannel->state"
    );

    const c = Channel.subscribe<string | undefined>(name);
    c.onMessage((message) => {
      state.message = message;
    });

    on.cleanup(() => {
      c.cleanup();
    });

    return state;
  }, "SimpleChannel");
}

function send(message: string): void {
  const latest = Channel.latest();

  if (latest === undefined) {
    expect(latest).not.toBeUndefined();
    return;
  }

  Channel.sendMessage(latest, message);
}

function ChannelResource(
  name: string | Reactive<string>
): ResourceBlueprint<string> {
  const reactive = intoReactive(name);

  return Resource((r) => {
    const lastMessage = Cell<string | undefined>(undefined, "last message");

    const c = Channel.subscribe<string | undefined>(reactive.read());
    c.onMessage((message) => {
      lastMessage.set(message);
    });

    r.on.cleanup(() => {
      c.cleanup();
    });

    return lastMessage;
  }, "ChannelResource");
}
