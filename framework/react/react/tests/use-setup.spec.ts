// @vitest-environment jsdom

import { Cell, TIMELINE } from "@starbeam/core";
import { entryPoint } from "@starbeam/debug";
import { useReactive, useReactiveSetup } from "@starbeam/react";
import {
  html,
  react,
  testStrictAndLoose,
} from "@starbeam-workspace/react-test-utils";
import { describe, expect } from "vitest";

import { Channel } from "./support/channel.js";

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
  testStrictAndLoose.strict<void, State>(
    "useSetup phases",
    async (mode, test) => {
      const result = await test
        .expectStable()
        .expectHTML(
          (value) =>
            `<span>${value.state}</span>${
              value.state === "message"
                ? `<span>${value.lastMessage}</span>`
                : ""
            }`
        )
        .render((test) => {
          const state = useReactiveSetup((setup) => {
            const state = Cell({ state: "rendering" } as State, "outer cell");

            setup.on.idle(() => {
              const channel = Channel.subscribe("test");
              state.set({ state: "connected" });

              channel.onMessage((message) => {
                state.set({ state: "message", lastMessage: message });
              });

              return () => {
                state.set({ state: "disconnected" });
              };
            });

            return state;
          });

          return useReactive(() => {
            test.value(state);

            return react.fragment(
              html.span(state.state),
              state.state === "message" ? html.span(state.lastMessage) : null
            );
          });
        });

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

      await result.rerender();
      await result.act(() => send("first message"));

      expect(result.value).toEqual({
        state: "message",
        lastMessage: "first message",
      });
    }
  );
});

// testStrictAndLoose.loose("useSetup", async (mode) => {
//   const result = mode
//     .render(() => {
//       const [reactCount, setReactCount] = useState(0);

//       const { count, increment } = useSetup(() => {
//         const cell = Cell(0);

//         function increment() {
//           cell.update((count) => count + 1);
//         }

//         return {
//           count: cell,
//           increment,
//         };
//       });

//       return {
//         value: { starbeam: count.current, react: reactCount },
//         dom: useReactive(() =>
//           react.fragment(
//             html.p(
//               count.current,
//               " + ",
//               reactCount,
//               " = ",
//               count.current + reactCount
//             ),
//             html.label(
//               html.span("Increment"),
//               html.button({ onClick: increment }, "++Starbeam++"),
//               html.button(
//                 { onClick: () => setReactCount((count) => count + 1) },
//                 "++React++"
//               )
//             )
//           )
//         ),
//       };
//     })
//     .expectStableValue()
//     .expectHTML(
//       (count) =>
//         `<p>${count.starbeam} + ${count.react} = ${
//           count.starbeam + count.react
//         }</p><label><span>Increment</span><button>++Starbeam++</button><button>++React++</button></label>`
//     );

//   expect(result.value).toEqual({ starbeam: 0, react: 0 });
//   await result.findByText("++Starbeam++").fire.click();
// });
