// @vitest-environment jsdom

import { entryPoint } from "@starbeam/debug";
import { use, useProp } from "@starbeam/react";
import { Reactive } from "@starbeam/timeline";
import { type ResourceBlueprint, Cell, Resource } from "@starbeam/universal";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { beforeEach, describe, expect } from "vitest";

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
        entryPoint((): void => {
          const latest = Channel.latest();

          if (latest === undefined) {
            expect(latest).not.toBeUndefined();
            return;
          }

          Channel.sendMessage(latest, message);
        });
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
        entryPoint((): void => {
          const latest = Channel.latest();

          if (latest === undefined) {
            expect(latest).not.toBeUndefined();
            return;
          }

          Channel.sendMessage(latest, message);
        });
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
        entryPoint((): void => {
          const latest = Channel.latest();

          if (latest === undefined) {
            expect(latest).not.toBeUndefined();
            return;
          }

          Channel.sendMessage(latest, message);
        });
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

function ChannelResource(
  name: Reactive<string> | string
): ResourceBlueprint<string | undefined> {
  const reactive = Reactive.from(name);

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
