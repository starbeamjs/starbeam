// @vitest-environment jsdom

import { entryPoint } from "@starbeam/debug";
import { useReactive, useSetup } from "@starbeam/react";
import { Cell } from "@starbeam/universal";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { describe, expect } from "vitest";

import { Channels } from "./support/channel.js";

const CHANNELS = new Channels<string>();

type State =
  | {
      state: "rendering";
    }
  | {
      state: "connected";
    }
  | {
      state: "message";
      lastMessage: string;
    }
  | {
      state: "disconnected";
    };

describe("useSetup", () => {
  testReact.strict<void, State>("useSetup phases", async (root) => {
    const result = await root
      .expectStable()
      .expectHTML(
        (value) =>
          `<span>${value.state}</span>${
            value.state === "message" ? `<span>${value.lastMessage}</span>` : ""
          }`
      )
      .render((state) => {
        const reactiveState = useSetup((setup) => {
          const renderState = Cell(
            { state: "rendering" } as State,
            "outer cell"
          );

          setup.on.idle(() => {
            const channel = CHANNELS.subscribe("test");
            renderState.set({ state: "connected" });

            channel.onMessage((message) => {
              renderState.set({ state: "message", lastMessage: message });
            });

            return () => {
              renderState.set({ state: "disconnected" });
            };
          });

          return renderState;
        });

        return useReactive(() => {
          const current = reactiveState.current;
          state.value(current);

          return react.fragment(
            html.span(current.state),
            current.state === "message" ? html.span(current.lastMessage) : null
          );
        });
      });

    function send(message: string): void {
      entryPoint((): void => {
        const latest = CHANNELS.latest();

        if (latest === undefined) {
          expect(latest).not.toBeUndefined();
          return;
        }

        CHANNELS.sendMessage(latest, message);
      });
    }

    await result.rerender();
    await result.act(() => {
      send("first message");
    });

    expect(result.value).toEqual({
      state: "message",
      lastMessage: "first message",
    });
  });
});
