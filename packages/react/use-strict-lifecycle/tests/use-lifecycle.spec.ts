// @vitest-environment jsdom

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

        const lifecycleTest = useLifecycle({ props: count }).render(
          ({ on }, i) => {
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
          }
        );

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

    await result.unmount();
    resource.assert("unmounted", 1);
  }
);

testReact<void, { count: number }>("most basic useLifecycle", async (root) => {
  await root
    .expectStable()
    .expectHTML(({ count }) => `<div>${count}</div>`)
    .render((setup) => {
      const [count] = useState(0);

      const lifecycle = useLifecycle({ props: count }).render(() => {
        const object = { count };

        setup.value({ count });

        return object;
      });

      return react.fragment(html.div(lifecycle.count));
    });
});

testReact<void, { count: number }>("useLifecycle with update", async (root) => {
  const result = await root
    .expectStable()
    .expectHTML(({ count }) => `<div>${count}</div><button>++</button>`)
    .render((setup) => {
      const [count, setCount] = useState(0);

      const lifecycle = useLifecycle({ props: count }).render(({ on }) => {
        const object = { count };

        on.update((newCount) => {
          setup.value({ count: newCount });
          object.count = newCount;
        });

        setup.value({ count });

        return object;
      });

      return react.fragment(
        html.div(lifecycle.count),
        html.button(
          {
            onClick: () => {
              setCount((i) => i + 1);
            },
          },
          "++"
        )
      );
    });

  await result.find("button").fire.click();

  expect(result.value).toEqual({ count: 1 });
});

testReact<void, { count: number }>(
  "useLifecycle with cleanup",
  async (root) => {
    const result = await root
      .expectStable()
      .expectHTML(({ count }) => `<div>${count}</div><button>++</button>`)
      .render((setup) => {
        const [count, setCount] = useState(0);

        const lifecycle = useLifecycle({ props: count }).render(({ on }) => {
          const object = { count, cleanup: 0 };

          on.cleanup((newCount) => {
            object.count = newCount;
            object.cleanup++;
          });

          on.update((newCount) => {
            object.count = newCount;
          });

          setup.value(object);

          return object;
        });

        return react.fragment(
          html.div(lifecycle.count),
          html.button(
            {
              onClick: () => {
                setCount((i) => i + 1);
              },
            },
            "++"
          )
        );
      });

    await result.find("button").fire.click();

    expect(result.value).toEqual({ count: 1, cleanup: 0 });

    await result.unmount();

    expect(result.value).toEqual({ count: 1, cleanup: 1 });
  }
);

testReact<void, { count: number }>(
  "useLifecycle with cleanup and prev",
  async (root, mode) => {
    const result = await root
      .expectStable()
      .expectHTML(({ count }) => `<div>${count}</div><button>++</button>`)
      .render((setup) => {
        const [count, setCount] = useState(0);

        interface State {
          count: number;
          cleanup: number;
        }

        const lifecycle = useLifecycle({ props: count }).render(
          ({ on }, _, prev?: State | undefined): State => {
            const object = { count, cleanup: prev?.cleanup ?? 0 };

            on.cleanup((newCount) => {
              object.count = newCount;
              object.cleanup++;
            });

            on.update((newCount) => {
              object.count = newCount;
            });

            setup.value(object);

            return object;
          }
        );

        return react.fragment(
          html.div(lifecycle.count),
          html.button(
            {
              onClick: () => {
                setCount((i) => i + 1);
              },
            },
            "++"
          )
        );
      });

    await result.find("button").fire.click();

    // Strict mode cleans up the component one extra time. Since we're using the `prev` feature, we
    // can see this extra cleanup.
    const initialCleanup = mode.match({
      strict: () => 1,
      loose: () => 0,
    });

    expect(result.value).toEqual({ count: 1, cleanup: initialCleanup });

    await result.unmount();

    expect(result.value).toEqual({ count: 1, cleanup: initialCleanup + 1 });
  }
);

testReact<void, { count: number }>(
  "useLifecycle with invalidation",
  async (root, mode) => {
    const result = await root
      .expectStable()
      .expectHTML(
        ({ count }) =>
          `<div>${count}</div><button>++</button><button>cleanup</button>`
      )
      .render((setup) => {
        const [count, setCount] = useState(0);
        const [cleanup, setCleanup] = useState({});

        interface State {
          count: number;
          cleanup: number;
        }

        const lifecycle = useLifecycle({
          props: count,
          validate: cleanup,
          with: Object.is,
        }).render(({ on }, count, prev?: State | undefined): State => {
          const object = { count, cleanup: prev?.cleanup ?? 0 };

          on.cleanup((newCount) => {
            object.count = newCount;
            object.cleanup++;
          });

          on.update((newCount) => {
            object.count = newCount;
          });

          setup.value(object);

          return object;
        });

        return react.fragment(
          html.div(lifecycle.count),
          html.button(
            {
              onClick: () => {
                setCount((i) => i + 1);
              },
            },
            "++"
          ),
          html.button(
            {
              onClick: () => {
                setCleanup({});
              },
            },
            "cleanup"
          )
        );
      });

    // Strict mode cleans up the component one extra time. Since we're using the `prev` feature, we
    // can see this extra cleanup.
    const initialCleanup = mode.match({
      strict: () => 1,
      loose: () => 0,
    });

    expect(result.value).toEqual({ count: 0, cleanup: initialCleanup });

    await result.find("button", { name: "++" }).fire.click();

    expect(result.value).toEqual({ count: 1, cleanup: initialCleanup });

    await result.find("button", { name: "cleanup" }).fire.click();

    expect(result.value).toEqual({ count: 1, cleanup: initialCleanup + 1 });

    await result.find("button", { name: "++" }).fire.click();
    expect(result.value).toEqual({ count: 2, cleanup: initialCleanup + 1 });

    await result.unmount();

    expect(result.value).toEqual({ count: 2, cleanup: initialCleanup + 2 });
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
    expect(this.#state).toBe(state);
    expect(this.#count).toBe(count);

    if (id) {
      expect({ id: this.#id }).toMatchObject({ id });
    }
  }
}
