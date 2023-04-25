// @vitest-environment jsdom

import type { Lifecycle } from "@starbeam/react";
import { setup, useReactive } from "@starbeam/react";
import { Cell } from "@starbeam/universal";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { describe, expect } from "@starbeam-workspace/test-utils";
import type { ReactElement } from "react";

import { Channels } from "./support/channel.js";

const CHANNELS = new Channels<string>();

type State =
  | {
      state: "rendering";
      name?: string | undefined;
    }
  | {
      state: "connected";
      name?: string | undefined;
    }
  | {
      state: "message";
      lastMessage: string;
      name?: string | undefined;
    }
  | {
      state: "disconnected";
      name?: string | undefined;
    };

interface TestProps {
  greeting: string;
}

describe("useSetup", () => {
  testReact<void, State>("returning a render function", async (root) => {
    const result = root
      .expectStable()
      .expectHTML(
        (value) =>
          `<span>${value.state}</span>${
            value.state === "message" ? `<span>${value.lastMessage}</span>` : ""
          }`
      )
      .render((state) => {
        const formula = setup((element) => {
          const renderState = subscribe(element);

          return () => {
            const current = renderState.current;
            state.value(current);

            return react.fragment(
              html.span(current.state),
              current.state === "message"
                ? html.span(current.lastMessage)
                : null
            );
          };
        });

        return useReactive(formula, []);
      });

    function send(message: string): void {
      const latest = CHANNELS.latest();

      if (latest === undefined) {
        expect(latest).not.toBeUndefined();
        return;
      }

      CHANNELS.sendMessage(latest, message);
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

  testReact<TestProps, State>(
    "returning a render function that takes props",
    async (root) => {
      const result = root
        .expectStable()
        .expectHTML(
          (value, { greeting }) =>
            `<span>${greeting}</span><span> </span><span>${value.state}</span>${
              value.state === "message"
                ? `<span>${value.lastMessage}</span>`
                : ""
            }`
        )
        .render(
          (value, props) => {
            const instance = setup((element) => {
              const renderState = subscribe(element);

              return ({ greeting }: TestProps): ReactElement => {
                const current = renderState.current;
                value.value(current);

                return react.fragment(
                  html.span(greeting),
                  html.span(" "),
                  html.span(current.state),
                  current.state === "message"
                    ? html.span(current.lastMessage)
                    : null
                );
              };
            });

            return useReactive(() => instance(props), [props]);
          },
          { greeting: "hello" }
        );

      function send(message: string): void {
        const latest = CHANNELS.latest();

        if (latest === undefined) {
          expect(latest).not.toBeUndefined();
          return;
        }

        CHANNELS.sendMessage(latest, message);
      }

      await result.rerender();
      await result.act(() => {
        send("first message");
      });

      expect(result.value).toEqual({
        state: "message",
        lastMessage: "first message",
      });
    }
  );

  testReact<void, State>("returning a reactive value", async (root) => {
    const result = root
      .expectStable()
      .expectHTML(
        (value) =>
          `<span>${value.state}</span>${
            value.state === "message" ? `<span>${value.lastMessage}</span>` : ""
          }`
      )
      .render((state) => {
        const a = setup((element) => subscribe(element));
        const reactiveState = useReactive(a);

        state.value(reactiveState);

        return react.fragment(
          html.span(reactiveState.state),
          reactiveState.state === "message"
            ? html.span(reactiveState.lastMessage)
            : null
        );
      });

    function send(message: string): void {
      const latest = CHANNELS.latest();

      if (latest === undefined) {
        expect(latest).not.toBeUndefined();
        return;
      }

      CHANNELS.sendMessage(latest, message);
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

  testReact<void, State>("returning a static value", async (root) => {
    const result = root
      .expectStable()
      .expectHTML(
        (value) =>
          `<span>${value.state}</span>${
            value.state === "message" ? `<span>${value.lastMessage}</span>` : ""
          }`
      )
      .render((state) => {
        const { lastRender } = setup((element) => {
          const renderState = subscribe(element);

          return { lastRender: renderState };
        });

        return useReactive(() => {
          const current = lastRender.current;
          state.value(current);

          return react.fragment(
            html.span(current.state),
            current.state === "message" ? html.span(current.lastMessage) : null
          );
        }, []);
      });

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

function send(message: string): void {
  const latest = CHANNELS.latest();

  if (latest === undefined) {
    expect(latest).not.toBeUndefined();
    return;
  }

  CHANNELS.sendMessage(latest, message);
}

function subscribe(element: Lifecycle): Cell<State> {
  const renderState = Cell({ state: "rendering" } as State, "outer cell");
  element.on.idle(() => {
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
}
