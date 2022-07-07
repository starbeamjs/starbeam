// @vitest-environment jsdom

import { Cell, Reactive, Resource, TIMELINE } from "@starbeam/core";
import { ReactiveCell } from "@starbeam/core/src/reactive-core/cell.js";
import { entryPoint } from "@starbeam/debug";
import { useProp, useResource } from "@starbeam/react";
import {
  html,
  react,
  testStrictAndLoose,
} from "@starbeam-workspace/react-test-utils";
import { beforeEach, describe, expect } from "vitest";

import { Channel } from "./support/channel.js";

function IntoReactive<T>(value: T | Reactive<T>): Reactive<T> {
  if (Reactive.is(value)) {
    return value;
  } else {
    return Cell(value);
  }
}

function ChannelResource(name: string | Reactive<string>) {
  const reactive = IntoReactive(name);

  return Resource((r) => {
    const lastMessage = Cell<string | null>(null);

    r.on.setup(() => {
      const c = Channel.subscribe(reactive.current);

      c.onMessage((message) => {
        lastMessage.set(message);
      });

      return () => c.cleanup();
    });

    return () => lastMessage.current;
  });
}

describe("useResource", () => {
  beforeEach(Channel.reset);

  testStrictAndLoose.strict<{ name: string }, string | null>(
    "using dependencies",
    async (mode, test) => {
      const result = await test
        .expectHTML((message) => `<span>${message ?? "loading"}</span>`)
        .render(
          (test, { name }) => {
            const message = useResource(() => ChannelResource(name), [name]);

            test.value(message);

            return react.fragment(html.span(message ?? "loading"));
          },
          { name: "test" }
        );

      function send(message: string) {
        return entryPoint((): void => {
          const latest = Channel.latest();

          if (latest === undefined) {
            expect(latest).not.toBeUndefined();
            return;
          }

          TIMELINE.enqueueAction(() => {
            Channel.sendMessage(latest, message);
          });
        });
      }

      let channel = Channel.latest();
      expect(channel).not.toBeUndefined();

      expect(result.value).toBe(null);
      await result.rerender();
      await result.act(() => send("first message"));
      expect(result.value).toEqual("first message");

      await result.act(() => send("second message"));
      expect(result.value).toEqual("second message");

      await result.rerender({ name: "test2" });
      expect(channel?.isActive).toBe(false);

      channel = Channel.latest();
      expect(channel).not.toBeUndefined();
      expect(channel?.isActive).toBe(true);

      await result.act(() => send("third message"));
      expect(result.value).toEqual("third message");

      await result.unmount();
      expect(channel?.isActive).toBe(false);
    }
  );

  testStrictAndLoose.skip<{ name: string }, string | null>(
    "using reactive inputs",
    async (mode, test) => {
      const result = await test
        .expectHTML((message) => `<span>${message ?? "loading"}</span>`)
        .render(
          (test, { name }) => {
            const channelName = useProp(name);
            const message = useResource(
              () => ChannelResource(channelName.current),
              []
            );

            test.value(message);

            return react.fragment(html.span(message ?? "loading"));
          },
          { name: "test" }
        );

      function send(message: string) {
        return entryPoint((): void => {
          const latest = Channel.latest();

          if (latest === undefined) {
            expect(latest).not.toBeUndefined();
            return;
          }

          TIMELINE.enqueueAction(() => {
            Channel.sendMessage(latest, message);
          });
        });
      }

      const channel = Channel.latest();
      expect(channel).not.toBeUndefined();

      expect(result.value).toBe(null);
      await result.rerender();
      await result.act(() => send("first message"));
      expect(result.value).toEqual("first message");

      await result.act(() => send("second message"));
      expect(result.value).toEqual("second message");

      await result.rerender({ name: "test2" });
      expect(channel?.isActive).toBe(false);
    }
  );
});
