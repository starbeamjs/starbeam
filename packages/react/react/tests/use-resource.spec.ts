// @vitest-environment jsdom

import { Cell, Resource } from "@starbeam/universal";
import { entryPoint } from "@starbeam/debug";
import { useProp, useResource } from "@starbeam/react";
import { Reactive } from "@starbeam/timeline";
import {
  html,
  react,
  testStrictAndLoose,
} from "@starbeam-workspace/react-test-utils";
import { beforeEach, describe, expect } from "vitest";

import { Channel } from "./support/channel.js";

function ChannelResource(name: Reactive<string> | string) {
  const reactive = Reactive.from(name);

  return Resource((r) => {
    console.log("running resource");
    const lastMessage = Cell<string | null>(null, "last message");

    const c = Channel.subscribe(reactive.read());
    c.onMessage((message) => {
      lastMessage.set(message);
    });

    r.on.cleanup(() => {
      return c.cleanup();
    });

    return lastMessage;
  }, "ChannelResource");
}

describe.todo("useResource", () => {
  beforeEach(Channel.reset);

  testStrictAndLoose.loose<{ name: string }, string | null | undefined>(
    "using useProp",
    async (mode, test) => {
      const result = await test
        .expectHTML((message) => `<span>${message ?? "loading"}</span>`)
        .render(
          (test, props) => {
            const name = useProp(props.name);
            const message = useResource(() => ChannelResource(name), {
              initial: null,
            });

            test.value(message ?? null);

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

          Channel.sendMessage(latest, message);
        });
      }

      const channel = Channel.latest();
      expect(channel).not.toBeUndefined();

      expect(result.value).toBe(null);
      await result.act(() => send("first message"));
      // await result.rerender();
      // expect(result.value).toEqual("first message");

      // await result.act(() => send("second message"));
      // expect(result.value).toEqual("second message");

      // await result.rerender({ name: "test2" });
      // expect(channel?.isActive).toBe(false);

      // channel = Channel.latest();
      // expect(channel).not.toBeUndefined();
      // expect(channel?.isActive).toBe(true);

      // await result.act(() => send("third message"));
      // expect(result.value).toEqual("third message");

      // await result.unmount();
      // expect(channel?.isActive).toBe(false);
    }
  );

  testStrictAndLoose.loose<{ name: string }, string | null | undefined>(
    "using a dependency array",
    async (mode, test) => {
      const result = await test
        .expectHTML((message) => `<span>${message ?? "loading"}</span>`)
        .render(
          (test, { name }) => {
            const message = useResource(
              () => ChannelResource(name),
              { initial: null },
              [name]
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
            // expect(latest).not.toBeUndefined();
            return;
          }

          Channel.sendMessage(latest, message);
        });
      }

      let channel = Channel.latest();
      // expect(channel).not.toBeUndefined();

      expect(result.value).toBe(undefined);
      await result.act(() => send("first message"));
      await result.rerender();
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

  // testStrictAndLoose.skip<{ name: string }, string | null>(
  //   "using reactive inputs",
  //   async (mode, test) => {
  //     const result = await test
  //       .expectHTML((message) => `<span>${message ?? "loading"}</span>`)
  //       .render(
  //         (test, { name }) => {
  //           const channelName = useProp(name);
  //           const message = useResource(
  //             () => ChannelResource(channelName.current),
  //             []
  //           );

  //           test.value(message);

  //           return react.fragment(html.span(message ?? "loading"));
  //         },
  //         { name: "test" }
  //       );

  //     function send(message: string) {
  //       return entryPoint((): void => {
  //         const latest = Channel.latest();

  //         if (latest === undefined) {
  //           expect(latest).not.toBeUndefined();
  //           return;
  //         }

  //         TIMELINE.enqueueAction(() => {
  //           Channel.sendMessage(latest, message);
  //         });
  //       });
  //     }

  //     const channel = Channel.latest();
  //     expect(channel).not.toBeUndefined();

  //     expect(result.value).toBe(null);
  //     await result.rerender();
  //     await result.act(() => send("first message"));
  //     expect(result.value).toEqual("first message");

  //     await result.act(() => send("second message"));
  //     expect(result.value).toEqual("second message");

  //     await result.rerender({ name: "test2" });
  //     expect(channel?.isActive).toBe(false);
  //   }
  // );
});
