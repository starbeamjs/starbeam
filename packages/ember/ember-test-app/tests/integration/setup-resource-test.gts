import { on } from "@ember/modifier";
import { click, clearRender, render, settled } from "@ember/test-helpers";
import Component from "@glimmer/component";
import {
  getResource,
  resource,
  setupReactiveResource,
  setupResource,
  useResource,
} from "@starbeam/ember";
import { Cell } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

module("setupResource | rendering", function (hooks) {
  setupRenderingTest(hooks);

  test("helper-backed resource can be used directly from a template", async function (assert) {
    const ticks = Cell(0);
    const syncs: number[] = [];

    const Counter = Resource(({ on: lifecycle }) => {
      lifecycle.sync(() => {
        syncs.push(ticks.current);
      });
      return {
        get value() {
          return ticks.current;
        },
      };
    });

    const counter = resource(Counter);

    class Display extends Component {
      bump = () => {
        ticks.current += 1;
      };

      <template>
        {{#let (counter) as |value|}}
          <p data-test-value>{{value.value}}</p>
        {{/let}}
        <button type="button" data-test-bump {{on "click" this.bump}}>bump</button>
      </template>
    }

    await render(<template><Display /></template>);
    assert.dom("[data-test-value]").hasText("0");
    assert.deepEqual(syncs, [0], "synced once on setup");

    await click("[data-test-bump]");
    assert.dom("[data-test-value]").hasText("1");
    assert.deepEqual(syncs, [0, 1], "synced after the cell changed");

    ticks.current = 5;
    await settled();
    assert.dom("[data-test-value]").hasText("5");
    assert.deepEqual(syncs, [0, 1, 5], "synced after an external write");
  });

  test("helper-backed resource can be invoked from component JavaScript", async function (assert) {
    const ticks = Cell(0);
    const syncs: number[] = [];

    const Counter = Resource(({ on: lifecycle }) => {
      lifecycle.sync(() => {
        syncs.push(ticks.current);
      });
      return {
        get value() {
          return ticks.current;
        },
      };
    });

    class Display extends Component {
      counter = useResource(this, Counter);

      get value() {
        return getResource(this.counter).value;
      }

      bump = () => {
        ticks.current += 1;
      };

      <template>
        <p data-test-value>{{this.value}}</p>
        <button type="button" data-test-bump {{on "click" this.bump}}>bump</button>
      </template>
    }

    await render(<template><Display /></template>);
    assert.dom("[data-test-value]").hasText("0");
    assert.deepEqual(syncs, [0], "synced once on setup");

    await click("[data-test-bump]");
    assert.dom("[data-test-value]").hasText("1");
    assert.deepEqual(syncs, [0, 1], "synced after the cell changed");
  });

  test("setupReactiveResource composes setup and read bridging", async function (assert) {
    const ticks = Cell(0);

    const Counter = Resource(({ on: lifecycle }) => {
      lifecycle.sync(() => {
        ticks.current;
      });
      return {
        get value() {
          return ticks.current;
        },
      };
    });

    class Display extends Component {
      counter = setupReactiveResource(Counter, this);

      bump = () => {
        ticks.current += 1;
      };

      <template>
        <p data-test-value>{{this.counter.current.value}}</p>
        <button type="button" data-test-bump {{on "click" this.bump}}>bump</button>
      </template>
    }

    await render(<template><Display /></template>);
    assert.dom("[data-test-value]").hasText("0");

    await click("[data-test-bump]");
    assert.dom("[data-test-value]").hasText("1");
  });

  test("syncs on setup and again after a Starbeam invalidation", async function (assert) {
    const ticks = Cell(0);
    const syncs: number[] = [];

    const Counter = Resource(({ on: lifecycle }) => {
      lifecycle.sync(() => {
        syncs.push(ticks.current);
      });
      return {
        get value() {
          return ticks.current;
        },
      };
    });

    class Display extends Component {
      counter = setupResource(Counter, this);

      get value(): number {
        return this.counter.value;
      }

      bump = () => {
        ticks.current += 1;
      };

      <template>
        <p data-test-value>{{this.value}}</p>
        <button type="button" data-test-bump {{on "click" this.bump}}>bump</button>
      </template>
    }

    await render(<template><Display /></template>);
    assert.dom("[data-test-value]").hasText("0");
    assert.deepEqual(syncs, [0], "synced once on setup");

    await click("[data-test-bump]");
    assert.dom("[data-test-value]").hasText("1");
    assert.deepEqual(syncs, [0, 1], "synced after the cell changed");

    ticks.current = 5;
    await settled();
    assert.dom("[data-test-value]").hasText("5");
    assert.deepEqual(syncs, [0, 1, 5], "synced after an external write");
  });

  test("runs the resource's cleanup when the component is torn down", async function (assert) {
    const ticks = Cell(0);
    let cleanups = 0;

    const WithCleanup = Resource(({ on: lifecycle }) => {
      lifecycle.sync(() => () => {
        cleanups += 1;
      });
      return {
        get value() {
          return ticks.current;
        },
      };
    });

    class Holder extends Component {
      resource = setupResource(WithCleanup, this);

      get value(): number {
        return this.resource.value;
      }

      <template>
        <p data-test-value>{{this.value}}</p>
      </template>
    }

    await render(<template><Holder /></template>);
    assert.dom("[data-test-value]").exists();
    assert.strictEqual(cleanups, 0);

    await clearRender();
    await settled();

    assert.strictEqual(cleanups, 1, "cleanup ran on teardown");

    // Subsequent cell mutations should not resurrect the resource.
    ticks.current = 99;
    await settled();
    assert.strictEqual(cleanups, 1);
  });
});
