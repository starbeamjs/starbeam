// @vitest-environment jsdom

import { entryPoint } from "@starbeam/debug";
import { useLifecycle } from "@starbeam/use-strict-lifecycle";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { useState } from "react";
import { expect } from "vitest";

testReact<void, { test: TestResource; lastState: string; lastCount: number }>(
  "useLifecycle",
  async (root, mode) => {
    TestResource.resetId();

    const result = await root
      .expectStable()
      .expectHTML(({ lastState, lastCount }) => {
        return `<p>${lastState}</p><p>${lastCount}</p><label><span>Increment</span><button>++</button></label>`;
      })
      .render((setup) => {
        const [count, setCount] = useState(0);

        const lifecycleTest = useLifecycle(count, ({ on }, i) => {
          const resource = TestResource.initial(i);

          on.update((newCount) => {
            resource.transition("updated", newCount);
          });
          on.layout(() => {
            resource.transition("layout");
          });
          on.idle(() => {
            resource.transition("idle");
          });
          on.cleanup(() => {
            resource.transition("unmounted");
          });

          return resource;
        });

        setup.value({
          test: lifecycleTest,
          lastState: lifecycleTest.state,
          lastCount: lifecycleTest.count,
        });

        return react.fragment(
          html.p(lifecycleTest.state),
          html.p(count),
          html.label(
            html.span("Increment"),
            html.button(
              {
                onClick: () => {
                  setCount(count + 1);
                },
              },
              "++"
            )
          )
        );
      });

    const { test: resource } = result.value;

    resource.assert(
      mode.match({
        // strict mode runs initial render twice
        strict: () => "updated",
        loose: () => "idle",
      }),
      0
    );

    await result.rerender();
    resource.assert("updated", 0);

    await result.find("button").fire.click();
    resource.assert("updated", 1);

    await result.rerender();
    resource.assert("updated", 1);

    result.unmount();
    resource.assert("unmounted", 1);
  }
);

// testReact("useResource (no argument)", async (mode) => {
//   TestResource.resetId();

//   const result = mode
//     .test(() => {
//       const [, setNotify] = useState({});

//       const test = useLifecycle((resource) => {
//         const test = TestResource.initial(0);

//         resource.on.update(() => test.transition("updated"));
//         resource.on.layout(() => test.transition("layout"));
//         resource.on.idle(() => test.transition("idle"));
//         resource.on.cleanup(() => test.transition("unmounted"));

//         return test;
//       });

//       return {
//         value: test,
//         dom: react.fragment(
//           html.p(test.state),
//           html.p(test.id),
//           html.label(
//             html.span("Notify"),
//             html.button({ onClick: () => setNotify({}) }, "setNotify({})")
//           )
//         ),
//       };
//     })
//     .expectStableValue()
//     .expectHTML(
//       (value) =>
//         `<p>${value.state}</p><p>${String(
//           value.id
//         )}</p><label><span>Notify</span><button>setNotify({})</button></label>`
//     );

//   const resource = result.value;

//   // strict mode runs initial render twice and *then* unmounts and remounts the component, which
//   // results in the resource getting create three times.
//   const expectedId = mode.match({
//     strict: () => 3,
//     loose: () => 1,
//   });

//   expect(resource.id).toBe(expectedId);

//   resource.assert(
//     mode.match({
//       // strict mode runs initial render twice
//       strict: () => "updated",
//       loose: () => "idle",
//     }),
//     0
//   );

//   result.rerender();
//   resource.assert("updated", 0, expectedId);

//   await result.find("button").fire.click();
//   resource.assert("updated", 0, expectedId);

//   result.rerender();
//   resource.assert("updated", 0, expectedId);

//   result.unmount();
//   resource.assert("unmounted", 0, expectedId);
// });

// testReact("useResource (nested)", async (mode) => {
//   TestResource.resetId();

//   const result = mode
//     .test(() => {
//       const [count, setCount] = useState(0);

//       const test = useLifecycle(count, (resource, count) => {
//         const test = TestResource.initial(count);

//         resource.on.update((count) => test.transition("updated", count));
//         resource.on.layout(() => test.transition("layout"));
//         resource.on.idle(() => test.transition("idle"));
//         resource.on.cleanup(() => test.transition("unmounted"));

//         return test;
//       });

//       return {
//         value: test,
//         dom: react.fragment(
//           react.render(ChildComponent, { count: test }),
//           html.p(count),
//           html.label(
//             html.span("Increment"),
//             html.button({ onClick: () => setCount(count + 1) }, "++")
//           )
//         ),
//       };
//     })
//     .expectStableValue()
//     .expectHTML(
//       ({ state, count }) =>
//         `<p>${state}</p><p>${count}</p><label><span>Increment</span><button>++</button></label>`
//     );

//   function ChildComponent({ count }: { count: TestResource }) {
//     return html.p(count.state);
//   }

//   const resource = result.value;

//   resource.assert(
//     mode.match({
//       strict: () => "updated",
//       loose: () => "idle",
//     }),
//     0
//   );

//   result.rerender();
//   resource.assert("updated", 0);

//   await result.find("button").fire.click();
//   resource.assert("updated", 1);

//   result.rerender();
//   resource.assert("updated", 1);

//   result.unmount();
//   resource.assert("unmounted", 1);
// });

// testReact(
//   "useResource (nested, stability across remounting)",
//   async (mode) => {
//     TestResource.resetId();

//     const result = mode
//       .test(() => {
//         const [count, setCount] = useState(0);

//         const test = useLifecycle(count, (resource, count) => {
//           const test = TestResource.initial(count);

//           resource.on.update((count) => test.transition("updated", count));
//           resource.on.layout(() => test.transition("layout"));
//           resource.on.idle(() => test.transition("idle"));
//           resource.on.cleanup(() => test.transition("unmounted"));

//           return test;
//         });

//         return {
//           value: test,
//           dom: react.fragment(
//             html.p(test.state),
//             html.p("parent:", count),
//             react.render(ChildComponent, {
//               count: test,
//               increment: () => setCount(count + 1),
//             })
//           ),
//         };
//       })
//       .expectStableValue()
//       .expectStable((value) => value)
//       .expectHTML(
//         ({ state, count, id }) =>
//           `<p>${state}</p><p>parent:${count}</p><p>child:${count} id:${String(
//             id
//           )}</p><label><span>Increment</span><button>++</button></label>`
//       );

//     function ChildComponent({
//       count,
//       increment,
//     }: {
//       count: TestResource;
//       increment: () => void;
//     }) {
//       return react.fragment(
//         // verify that the child sees the same TestResource as the parent
//         html.p("child:", count.count, " ", "id:", count.id),

//         html.label(
//           html.span("Increment"),
//           html.button({ onClick: () => increment() }, "++")
//         )
//       );
//     }

//     // const resource = result.value;

//     // const stableId = mode.match({ strict: () => 3, loose: () => 1 });

//     // resource.assert(
//     //   mode.match({
//     //     strict: () => "updated",
//     //     loose: () => "idle",
//     //   }),
//     //   0
//     // );

//     // result.rerender();
//     // resource.assert("updated", 0, stableId);

//     // await result.find("button").fire.click();
//     // resource.assert("updated", 1, stableId);

//     // result.rerender();
//     // resource.assert("updated", 1, stableId);

//     // result.unmount();
//     // resource.assert("unmounted", 1, stableId);
//   }
// );

let nextId = 0;

class TestResource {
  static resetId(): void {
    nextId = 0;
  }

  static initial(count: number): TestResource {
    return new TestResource("initial", count, ++nextId);
  }

  #state: string;
  #count: number;
  #id: number;

  private constructor(state: string, count: number, id: number) {
    this.#state = state;
    this.#count = count;
    this.#id = id;
  }

  get state(): string {
    return this.#state;
  }

  get count(): number {
    return this.#count;
  }

  get id(): number | null {
    return this.#id;
  }

  transition(state: string, count?: number): void {
    this.#state = state;

    if (count !== undefined) {
      this.#count = count;
    }
  }

  assert(state: string, count: number, id?: number): void {
    entryPoint(() => {
      expect(this.#state).toBe(state);
      expect(this.#count).toBe(count);

      if (id) {
        expect({ id: this.#id }).toMatchObject({ id });
      }
    });
  }
}
