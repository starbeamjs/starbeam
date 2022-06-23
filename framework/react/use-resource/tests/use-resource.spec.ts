// @vitest-environment jsdom

import { useState } from "react";
import { expect } from "vitest";

import { type Ref, useResource } from "../index.js";
import { html, react } from "./dom.js";
import { entryPoint } from "./entry.js";
import { testModes } from "./modes.js";

testModes("useResource", (mode) => {
  TestResource.resetId();

  const result = mode
    .render(() => {
      const [count, setCount] = useState(0);

      const resource = useResource
        .with({ count })
        .create(({ count }) => TestResource.initial(count))
        .update((resource, { count }) => resource.transition("updated", count))
        .on({
          attached: (resource) => resource.transition("attached"),
          ready: (resource) => resource.transition("ready"),
          deactivate: (resource) => resource.transition("detached"),
        });

      return {
        value: resource,
        dom: react.fragment(
          html.p(resource.current.state),
          html.p(count),
          html.label(
            html.span("Increment"),
            html.button({ onClick: () => setCount(count + 1) }, "++")
          )
        ),
      };
    })
    .expectStableValue()
    .expectHTML(
      (value) =>
        `<p>${value.current.state}</p><p>${value.current.count}</p><label><span>Increment</span><button>++</button></label>`
    );

  const resource = result.value.current;

  resource.assert(
    mode.match({
      strict: () => "updated",
      loose: () => "ready",
    }),
    0
  );

  result.rerender();
  resource.assert("updated", 0);

  result.find("button").fire.click();
  resource.assert("updated", 1);

  result.rerender();
  resource.assert("updated", 1);

  result.unmount();
  resource.assert("detached", 1);
});

testModes("useResource (nested)", (mode) => {
  TestResource.resetId();

  const result = mode
    .render(() => {
      const [count, setCount] = useState(0);

      const resource = useResource
        .with({ count })
        .create(({ count }) => TestResource.initial(count))
        .update((resource, { count }) => resource.transition("updated", count))
        .on({
          attached: (resource) => resource.transition("attached"),
          ready: (resource) => resource.transition("ready"),
          deactivate: (resource) => resource.transition("detached"),
        });

      return {
        value: resource,
        dom: react.fragment(
          react.render(ChildComponent, { count: resource }),
          html.p(count),
          html.label(
            html.span("Increment"),
            html.button({ onClick: () => setCount(count + 1) }, "++")
          )
        ),
      };
    })
    .expectStableValue()
    .expectHTML(
      ({ current: { state, count } }) =>
        `<p>${state}</p><p>${count}</p><label><span>Increment</span><button>++</button></label>`
    );

  function ChildComponent({ count }: { count: Ref<TestResource> }) {
    return html.p(count.current.state);
  }

  const resource = result.value.current;

  resource.assert(
    mode.match({
      strict: () => "updated",
      loose: () => "ready",
    }),
    0
  );

  result.rerender();
  resource.assert("updated", 0);

  result.find("button").fire.click();
  resource.assert("updated", 1);

  result.rerender();
  resource.assert("updated", 1);

  result.unmount();
  resource.assert("detached", 1);
});

testModes("useResource (nested, stability across remounting)", (mode) => {
  TestResource.resetId();

  const result = mode
    .render(() => {
      const [count, setCount] = useState(0);

      const resource = useResource
        .with({ count })
        .create(({ count }) => TestResource.initial(count))
        .update((resource, { count }) => resource.transition("updated", count))
        .on({
          attached: (resource) => resource.transition("attached"),
          ready: (resource) => resource.transition("ready"),
          deactivate: (resource) => resource.transition("detached"),
        });

      return {
        value: resource,
        dom: react.fragment(
          html.p(resource.current.state),
          html.p("parent:", count),
          react.render(ChildComponent, {
            count: resource,
            increment: () => setCount(count + 1),
          })
        ),
      };
    })
    .expectStableValue()
    .expectStable((value) => value.current)
    .expectHTML(
      ({ current: { state, count, id } }) =>
        `<p>${state}</p><p>parent:${count}</p><p>child:${count} id:${id}</p><label><span>Increment</span><button>++</button></label>`
    );

  function ChildComponent({
    count,
    increment,
  }: {
    count: Ref<TestResource>;
    increment: () => void;
  }) {
    return react.fragment(
      // verify that the child sees the same TestResource as the parent
      html.p("child:", count.current.count, " ", "id:", count.current.id),

      html.label(
        html.span("Increment"),
        html.button({ onClick: () => increment() }, "++")
      )
    );
  }

  const resource = result.value.current;

  const stableId = mode.match({ strict: () => 3, loose: () => 1 });

  resource.assert(
    mode.match({
      strict: () => "updated",
      loose: () => "ready",
    }),
    0
  );

  result.rerender();
  resource.assert("updated", 0, stableId);

  result.find("button").fire.click();
  resource.assert("updated", 1, stableId);

  result.rerender();
  resource.assert("updated", 1, stableId);

  result.unmount();
  resource.assert("detached", 1, stableId);
});

let id = 0;

class TestResource {
  static resetId(): void {
    id = 0;
  }

  static initial(count: number): TestResource {
    return new TestResource("initial", count, ++id);
  }

  #state: string;
  #count: number;
  #id: number;

  private constructor(state: string, count: number, id: number) {
    this.#state = state;
    this.#count = count;
    this.#id = id;
  }

  transition(state: string, count?: number) {
    this.#state = state;

    if (count !== undefined) {
      this.#count = count;
    }
  }

  assert(state: string, count: number, id?: number) {
    entryPoint(() => {
      expect(this.#state).toBe(state);
      expect(this.#count).toBe(count);

      if (id) {
        expect({ id: this.#id }).toMatchObject({ id });
      }
    });
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
}
