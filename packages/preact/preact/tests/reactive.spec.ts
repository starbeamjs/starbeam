// @vitest-environment jsdom

import { Cell, LIFETIME } from "@starbeam/core";
import { describe, expect, test } from "@starbeam-workspace/test-utils";
import htm from "htm";
import { h, options, render } from "preact";
import { create, setup } from "@starbeam/preact";
import { beforeAll } from "vitest";

const html = htm.bind(h);
let id = 0;

describe("useReactive", () => {
  beforeAll(() => setup(options));

  test("baseline", () => {
    function App({ name }: { name: string }) {
      return html`<div>hello ${name}</div>`;
    }

    render(html`<${App} name="World" />`, document.body);

    expect(document.body.innerHTML).toBe("<div>hello World</div>");
  });

  test("reactive values", () => {
    function App() {
      const { cell, increment } = create(ReactiveObject);

      return html`<p>${cell}</p>
        <button onClick=${increment}>++</button>`;
    }

    render(html`<${App} />`, document.body);

    expect(document.body.innerHTML).toBe("<p>0</p><button>++</button>");
  });

  // testStrictAndLoose<void, number>(
  //   "useReactiveSetup with useReactive",
  //   async (mode, test) => {
  //     const result = await test
  //       .expectHTML((value) => `<p>${value}</p><button>++</button>`)
  //       .render((test) => {
  //         const { cell, increment } = useReactiveSetup(() => {
  //           const cell = Cell(0, `#${++id}`);

  //           function increment() {
  //             cell.set(cell.current + 1);
  //           }

  //           return () => ({ cell, increment });
  //         }, "first useReactiveSetup");

  //         return useReactive(() => {
  //           test.value(cell.current);

  //           return react.fragment(
  //             html.p(String(cell.current)),
  //             html.button({ onClick: increment }, "++")
  //           );
  //         }, `JSX#${id}`);
  //       });

  //     expect(result.value).toBe(0);

  //     await result.find("button").fire.click();

  //     expect(result.value).toBe(1);
  //   }
  // );

  // testStrictAndLoose<void, { counter: number }>(
  //   "useSetup with Formula + useReactive",
  //   async (mode, test) => {
  //     let id = 0;
  //     const result = await test
  //       .expectHTML(({ counter }) => `<p>${counter}</p>`)
  //       .expectStable()
  //       .render((test) => {
  //         ++id;
  //         const counter = useReactiveSetup(() => {
  //           const cell = Cell(0, `#${id}`);
  //           return FormulaFn(() => ({ counter: cell.current }), `inner #${id}`);
  //         }, `#${id}`);

  //         test.value(counter);

  //         return react.fragment(html.p(String(counter.counter)));
  //       });

  //     expect(result.value).toEqual({ counter: 0 });

  //     // make sure the value is stable if the formula hasn't changed
  //     await result.rerender();
  //   }
  // );

  // testStrictAndLoose<void, { counter: number }>(
  //   "useSetup with Formula + useReactive",
  //   async (mode, test) => {
  //     id = 0;
  //     const result = await test
  //       .expectHTML(({ counter }) => `<p>${counter}</p><button>++</button>`)
  //       .expectStable()
  //       .render((test) => {
  //         ++id;
  //         const { formula, increment } = useReactiveSetup(() => {
  //           const cell = Cell(0, `#${id}`);
  //           return () => ({
  //             formula: FormulaFn(
  //               () => ({ counter: cell.current }),
  //               `inner #${id}`
  //             ),
  //             increment: () => {
  //               cell.update((count) => count + 1);
  //             },
  //           });
  //         }, `#${id}`);

  //         const counter = useReactive(formula);

  //         test.value(counter);

  //         return react.fragment(
  //           html.p(String(formula().counter)),
  //           html.button({ onClick: increment }, "++")
  //         );
  //       });

  //     await result.find("button").fire.click();

  //     expect(result.value).toEqual({ counter: 1 });

  //     // make sure the value is stable if the formula hasn't changed
  //     await result.rerender();
  //   }
  // );

  // testStrictAndLoose<void, { starbeam: number; react: number }>(
  //   "useReactive",
  //   async (mode, test) => {
  //     const result = await test
  //       .expectStable()
  //       .expectHTML(
  //         (count) =>
  //           `<p>${count.starbeam} + ${count.react} = ${
  //             count.starbeam + count.react
  //           }</p><label><span>Increment</span><button>++Starbeam++</button><button>++React++</button></label>`
  //       )

  //       .render((test) => {
  //         const [reactCount, setReactCount] = useState(0);

  //         const { count, increment } = useReactiveSetup(() => {
  //           const cell = Cell(0);

  //           function increment() {
  //             cell.update((count) => count + 1);
  //           }

  //           return () => ({
  //             count: cell,
  //             increment,
  //           });
  //         });

  //         return useReactive(() => {
  //           test.value({ starbeam: count.current, react: reactCount });

  //           return react.fragment(
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
  //           );
  //         });
  //       });

  //     expect(result.value).toEqual({ starbeam: 0, react: 0 });
  //     await result.findByText("++Starbeam++").fire.click();

  //     expect(result.value).toEqual({ starbeam: 1, react: 0 });

  //     await result.findByText("++React++").fire.click();
  //     expect(result.value).toEqual({ starbeam: 1, react: 1 });
  //   }
  // );

  // testStrictAndLoose<void, { starbeam: number; react: number }>(
  //   "everything in useSetup",
  //   async (mode, test) => {
  //     const result = await test
  //       .expectStable()
  //       .expectHTML(
  //         (count) =>
  //           `<p>${count.starbeam} + ${count.react} = ${
  //             count.starbeam + count.react
  //           }</p><label><span>Increment</span><button>++Starbeam++</button><button>++React++</button></label>`
  //       )

  //       .render((test) => {
  //         return useReactiveSetup(() => {
  //           const cell = Cell(0);

  //           function increment() {
  //             cell.update((count) => count + 1);
  //           }

  //           return PolledFormulaFn(() => {
  //             const [reactCount, setReactCount] = useState(0);

  //             test.value({ starbeam: cell.current, react: reactCount });

  //             return react.fragment(
  //               html.p(
  //                 cell.current,
  //                 " + ",
  //                 reactCount,
  //                 " = ",
  //                 cell.current + reactCount
  //               ),
  //               html.label(
  //                 html.span("Increment"),
  //                 html.button({ onClick: increment }, "++Starbeam++"),
  //                 html.button(
  //                   { onClick: () => setReactCount((count) => count + 1) },
  //                   "++React++"
  //                 )
  //               )
  //             );
  //           });
  //         });
  //       });

  //     expect(result.value).toEqual({ starbeam: 0, react: 0 });
  //     await result.findByText("++Starbeam++").fire.click();

  //     expect(result.value).toEqual({ starbeam: 1, react: 0 });

  //     await result.findByText("++React++").fire.click();
  //     expect(result.value).toEqual({ starbeam: 1, react: 1 });
  //   }
  // );
});

// eslint-disable-next-line unused-imports/no-unused-vars
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

function ReactiveObject() {
  const cell = Cell(0, `#${++id}`);

  function increment() {
    cell.set(cell.current + 1);
  }

  return { cell, increment };
}
