// @vitest-environment jsdom

import { Cell, LIFETIME } from "@starbeam/core";
import { useReactive, useSetup } from "@starbeam/react";
import {
  html,
  react,
  testStrictAndLoose,
} from "@starbeam-workspace/react-test-utils";
import { useState } from "react";
import { describe, expect } from "vitest";

describe("useReactive", () => {
  testStrictAndLoose.loose("useReactive", async (mode) => {
    const result = await mode
      .test(() => {
        const [reactCount, setReactCount] = useState(0);

        const { count, increment } = useSetup(() => {
          const cell = Cell(0);

          function increment() {
            cell.update((count) => count + 1);
          }

          return () => ({
            count: cell,
            increment,
          });
        });

        return {
          value: { starbeam: count.current, react: reactCount },
          dom: useReactive(() =>
            react.fragment(
              html.p(
                count.current,
                " + ",
                reactCount,
                " = ",
                count.current + reactCount
              ),
              html.label(
                html.span("Increment"),
                html.button({ onClick: increment }, "++Starbeam++"),
                html.button(
                  { onClick: () => setReactCount((count) => count + 1) },
                  "++React++"
                )
              )
            )
          ),
        };
      })
      .expectStableValue()
      .expectHTML(
        (count) =>
          `<p>${count.starbeam} + ${count.react} = ${
            count.starbeam + count.react
          }</p><label><span>Increment</span><button>++Starbeam++</button><button>++React++</button></label>`
      )
      .render();

    expect(result.value).toEqual({ starbeam: 0, react: 0 });
    await result.findByText("++Starbeam++").fire.click();
  });
});

class TestResource {
  static #nextId = 0;

  static create() {
    return new TestResource(TestResource.#nextId++);
  }

  #id: number;
  #active = true;

  constructor(id: number) {
    this.#id = id;

    LIFETIME.on.cleanup(this, () => {
      this.#active = false;
    });
  }

  get id() {
    return this.#id;
  }

  get isActive() {
    return this.#active;
  }
}