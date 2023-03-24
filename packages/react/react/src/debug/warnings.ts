import { Message } from "@starbeam/debug";
import { TIMELINE } from "@starbeam/timeline";
import { isRendering } from "@starbeam/use-strict-lifecycle";

let WARNED = false;

if (import.meta.env.DEV) {
  TIMELINE.untrackedReadBarrier((tag, stack) => {
    if (isRendering()) {
      if (!WARNED) {
        WARNED = true;

        const description = tag.description.userFacing;
        const caller = stack.caller;

        const pad = Math.max(
          ...["Created: ", "Accessed: "].map((s) => s.length)
        );

        const message = Message([
          [
            ["ERROR", "color:#f00", "font-weight:bold"],
            " ",
            [
              "You read from a reactive value but you were not inside the `useReactive` hook.",
              "color: #b00",
            ],
          ],
          "",
          [
            ["Created: ".padEnd(pad, "…"), "color:#666"],
            " ",
            [description.fullName, "color:#6a6"],
          ],
          [
            [" ".repeat(pad), "color:#666"],
            " ",
            [description.frame?.link() ?? "<unknown>", "color:#6a6"],
          ],
          [
            ["Accessed: ".padEnd(pad, "…"), "color:#666"],
            " ",
            [caller?.link() ?? "<unknown>", "color:#6a6"],
          ],
          "",
          [
            [
              "This will prevent React from re-rendering when the reactive value changes.",
              "color:#b00",
            ],
          ],
          "",
          [
            [
              "Make sure that you are inside a `useReactive` hook whenever you access reactive state.",
              "color:#559",
            ],
          ],
          "",
          [
            [
              "You can wrap your entire component in `useReactive`, and return JSX to avoid this error. If you are also creating reactive cells in your component, you can use the `useSetup` hook to create cells and return JSX that reads from those cells.",
              "color:#559",
            ],
          ],
          "",
          [
            [
              "You can also use the `starbeam` HOC to create a component that automatically wraps your the entire body of your component in `useSetup`.",
              "color:#559",
            ],
          ],
        ]);

        console.warn(...message);

        console.groupCollapsed("Complete stack trace");
        console.log(stack.stack);
        console.groupEnd();
      }

      throw Error(
        `You read from a reactive value, but you were not inside the \`useReactive\` hook.`
      );
    }
  });
}
