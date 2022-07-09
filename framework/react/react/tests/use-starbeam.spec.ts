// @vitest-environment jsdom

import { Cell, Formula, LIFETIME, PolledFormula } from "@starbeam/core";
import { useReactive, useReactiveSetup } from "@starbeam/react";
import {
  html,
  react,
  testStrictAndLoose,
} from "@starbeam-workspace/react-test-utils";
import { useState } from "react";
import { describe, expect } from "vitest";

let id = 0;

describe("useStarbeam", () => {
  testStrictAndLoose<void, number>("useSetup", async (mode, test) => {
    id = 0;
    const result = await test
      .expectHTML((value) => `<p>${value}</p><button>++</button>`)
      .render((test) => {
        return useReactiveSetup(() => {
          const cell = Cell(0, `#${++id}`);

          function increment() {
            cell.set(cell.current + 1);
          }

          return () => {
            test.value(cell.current);
            return react.fragment(
              html.p(String(cell.current)),
              html.button({ onClick: increment }, "++")
            );
          };
        });
      });

    expect(result.value).toBe(0);

    await result.find("button").fire.click();

    expect(result.value).toBe(1);
  });

  testStrictAndLoose<void, number>(
    "useSetup with useReactive",
    async (mode, test) => {
      const result = await test
        .expectHTML((value) => `<p>${value}</p><button>++</button>`)
        .render((test) => {
          const { cell, increment } = useReactiveSetup(() => {
            const cell = Cell(0, `#${++id}`);

            function increment() {
              cell.set(cell.current + 1);
            }

            return () => ({ cell, increment });
          });

          return useReactive(() => {
            test.value(cell.current);

            return react.fragment(
              html.p(String(cell.current)),
              html.button({ onClick: increment }, "++")
            );
          }, `JSX#${id}`);
        });

      expect(result.value).toBe(0);

      await result.find("button").fire.click();

      expect(result.value).toBe(1);
    }
  );

  testStrictAndLoose<void, { counter: number }>(
    "useSetup with Formula + useReactive",
    async (mode, test) => {
      let id = 0;
      const result = await test
        .expectHTML(({ counter }) => `<p>${counter}</p>`)
        .expectStable()
        .render((test) => {
          ++id;
          const counter = useReactiveSetup(() => {
            const cell = Cell(0, `#${id}`);
            return Formula(() => ({ counter: cell.current }), `inner #${id}`);
          }, `#${id}`);

          test.value(counter);

          return react.fragment(html.p(String(counter.counter)));
        });

      expect(result.value).toEqual({ counter: 0 });

      // make sure the value is stable if the formula hasn't changed
      await result.rerender();
    }
  );

  testStrictAndLoose<void, { counter: number }>(
    "useSetup with Formula + useReactive",
    async (mode, test) => {
      id = 0;
      const result = await test
        .expectHTML(({ counter }) => `<p>${counter}</p><button>++</button>`)
        .expectStable()
        .render((test) => {
          ++id;
          const { formula, increment } = useReactiveSetup(() => {
            const cell = Cell(0, `#${id}`);
            return () => ({
              formula: Formula(
                () => ({ counter: cell.current }),
                `inner #${id}`
              ),
              increment: () => {
                cell.update((count) => count + 1);
              },
            });
          }, `#${id}`);

          const counter = useReactive(() => formula());

          test.value(counter);

          return react.fragment(
            html.p(String(formula().counter)),
            html.button({ onClick: increment }, "++")
          );
        });

      await result.find("button").fire.click();

      expect(result.value).toEqual({ counter: 1 });

      // make sure the value is stable if the formula hasn't changed
      await result.rerender();
    }
  );

  testStrictAndLoose<void, { starbeam: number; react: number }>(
    "useReactive",
    async (mode, test) => {
      const result = await test
        .expectStable()
        .expectHTML(
          (count) =>
            `<p>${count.starbeam} + ${count.react} = ${
              count.starbeam + count.react
            }</p><label><span>Increment</span><button>++Starbeam++</button><button>++React++</button></label>`
        )

        .render((test) => {
          const [reactCount, setReactCount] = useState(0);

          const { count, increment } = useReactiveSetup(() => {
            const cell = Cell(0);

            function increment() {
              cell.update((count) => count + 1);
            }

            return () => ({
              count: cell,
              increment,
            });
          });

          return useReactive(() => {
            test.value({ starbeam: count.current, react: reactCount });

            return react.fragment(
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
            );
          });
        });

      expect(result.value).toEqual({ starbeam: 0, react: 0 });
      await result.findByText("++Starbeam++").fire.click();

      expect(result.value).toEqual({ starbeam: 1, react: 0 });

      await result.findByText("++React++").fire.click();
      expect(result.value).toEqual({ starbeam: 1, react: 1 });
    }
  );

  testStrictAndLoose<void, { starbeam: number; react: number }>(
    "everything in useSetup",
    async (mode, test) => {
      const result = await test
        .expectStable()
        .expectHTML(
          (count) =>
            `<p>${count.starbeam} + ${count.react} = ${
              count.starbeam + count.react
            }</p><label><span>Increment</span><button>++Starbeam++</button><button>++React++</button></label>`
        )

        .render((test) => {
          return useReactiveSetup(() => {
            const cell = Cell(0);

            function increment() {
              cell.update((count) => count + 1);
            }

            return PolledFormula(() => {
              const [reactCount, setReactCount] = useState(0);

              test.value({ starbeam: cell.current, react: reactCount });

              return react.fragment(
                html.p(
                  cell.current,
                  " + ",
                  reactCount,
                  " = ",
                  cell.current + reactCount
                ),
                html.label(
                  html.span("Increment"),
                  html.button({ onClick: increment }, "++Starbeam++"),
                  html.button(
                    { onClick: () => setReactCount((count) => count + 1) },
                    "++React++"
                  )
                )
              );
            });
          });
        });

      expect(result.value).toEqual({ starbeam: 0, react: 0 });
      await result.findByText("++Starbeam++").fire.click();

      expect(result.value).toEqual({ starbeam: 1, react: 0 });

      await result.findByText("++React++").fire.click();
      expect(result.value).toEqual({ starbeam: 1, react: 1 });
    }
  );
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
class TestResource {
  static #nextId = 0;
  static #resources: TestResource[] = [];

  static setup() {
    this.#nextId = 0;
    this.#resources = [];
  }

  static get resources(): TestResource[] {
    return TestResource.#resources;
  }

  static create() {
    const resource = new TestResource(TestResource.#nextId++);
    TestResource.#resources.push(resource);
    return resource;
  }

  #id: number;
  #active = true;

  private constructor(id: number) {
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
