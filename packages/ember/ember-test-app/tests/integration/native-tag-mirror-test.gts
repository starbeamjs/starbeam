import { on } from "@ember/modifier";
import { click, render, settled } from "@ember/test-helpers";
import { cached, tracked } from "@glimmer/tracking";
import Component from "@glimmer/component";
import { reactive } from "@starbeam/collections";
import { setupResource } from "@starbeam/ember";
import { Cell, Formula } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

module("Starbeam native tag mirror | rendering", function (hooks) {
  setupRenderingTest(hooks);

  test("plain getters rerender when Starbeam cells change", async function (assert) {
    const count = Cell(1);

    class Counter extends Component {
      get doubled(): number {
        return count.current * 2;
      }

      increment = () => {
        count.current += 1;
      };

      <template>
        <p data-test-doubled>{{this.doubled}}</p>
        <button type="button" data-test-increment {{on "click" this.increment}}>
          increment
        </button>
      </template>
    }

    await render(<template><Counter /></template>);
    assert.dom("[data-test-doubled]").hasText("2");

    await click("[data-test-increment]");
    assert.dom("[data-test-doubled]").hasText("4");

    count.current = 10;
    await settled();
    assert.dom("[data-test-doubled]").hasText("20");
  });

  test("plain getters can read through domain objects", async function (assert) {
    interface LineItem {
      readonly quantity: number;
      readonly unitCents: number;
    }

    class Cart {
      readonly #items = reactive.Map<string, LineItem>();

      get totalCents(): number {
        let total = 0;

        for (const item of this.#items.values()) {
          total += item.quantity * item.unitCents;
        }

        return total;
      }

      add(id: string, item: LineItem): void {
        this.#items.set(id, item);
      }
    }

    const cart = new Cart();
    cart.add("coffee", { quantity: 1, unitCents: 300 });

    class CartTotal extends Component {
      get total(): number {
        return cart.totalCents;
      }

      addBagel = () => {
        cart.add("bagel", { quantity: 2, unitCents: 250 });
      };

      <template>
        <p data-test-total>{{this.total}}</p>
        <button type="button" data-test-add {{on "click" this.addBagel}}>
          add bagel
        </button>
      </template>
    }

    await render(<template><CartTotal /></template>);
    assert.dom("[data-test-total]").hasText("300");

    await click("[data-test-add]");
    assert.dom("[data-test-total]").hasText("800");
  });

  test("plain getters can mix Starbeam and Glimmer dependencies", async function (assert) {
    const count = Cell(2);

    class Mixed extends Component {
      @tracked multiplier = 2;

      get scaled(): number {
        return count.current * this.multiplier;
      }

      incrementCount = () => {
        count.current += 1;
      };

      triple = () => {
        this.multiplier = 3;
      };

      <template>
        <p data-test-scaled>{{this.scaled}}</p>
        <button type="button" data-test-count {{on "click" this.incrementCount}}>
          increment count
        </button>
        <button type="button" data-test-triple {{on "click" this.triple}}>
          triple
        </button>
      </template>
    }

    await render(<template><Mixed /></template>);
    assert.dom("[data-test-scaled]").hasText("4", "initial: count=2 * mult=2");

    await click("[data-test-triple]");
    assert
      .dom("[data-test-scaled]")
      .hasText("6", "rerenders when the @tracked field changes");

    await click("[data-test-count]");
    assert
      .dom("[data-test-scaled]")
      .hasText("9", "rerenders when the Starbeam cell changes");
  });

  test("plain getters refresh dynamic Starbeam dependencies", async function (assert) {
    const left = Cell(1);
    const right = Cell(10);

    class Picker extends Component {
      @tracked side: "left" | "right" = "left";

      get selected(): string {
        return this.side === "left"
          ? `left=${left.current}`
          : `right=${right.current}`;
      }

      chooseRight = () => {
        this.side = "right";
      };
      bumpLeft = () => {
        left.current += 1;
      };
      bumpRight = () => {
        right.current += 1;
      };

      <template>
        <p data-test-selected>{{this.selected}}</p>
        <button type="button" data-test-right {{on "click" this.chooseRight}}>
          choose right
        </button>
        <button type="button" data-test-bump-left {{on "click" this.bumpLeft}}>
          bump left
        </button>
        <button type="button" data-test-bump-right {{on "click" this.bumpRight}}>
          bump right
        </button>
      </template>
    }

    await render(<template><Picker /></template>);
    assert.dom("[data-test-selected]").hasText("left=1");

    await click("[data-test-right]");
    assert.dom("[data-test-selected]").hasText("right=10");

    await click("[data-test-bump-left]");
    assert.dom("[data-test-selected]").hasText("right=10");

    await click("[data-test-bump-right]");
    assert.dom("[data-test-selected]").hasText("right=11");
  });

  test("Formula reruns inside Glimmer tracking and can mix dependency systems", async function (assert) {
    const count = Cell(2);

    class MixedFormula extends Component {
      @tracked multiplier = 2;

      readonly scaled = Formula(() => count.current * this.multiplier);

      get value(): number {
        return this.scaled.current;
      }

      incrementCount = () => {
        count.current += 1;
      };

      triple = () => {
        this.multiplier = 3;
      };

      <template>
        <p data-test-value>{{this.value}}</p>
        <button type="button" data-test-count {{on "click" this.incrementCount}}>
          increment count
        </button>
        <button type="button" data-test-triple {{on "click" this.triple}}>
          triple
        </button>
      </template>
    }

    await render(<template><MixedFormula /></template>);
    assert.dom("[data-test-value]").hasText("4");

    await click("[data-test-triple]");
    assert.dom("[data-test-value]").hasText("6");

    await click("[data-test-count]");
    assert.dom("[data-test-value]").hasText("9");
  });

  test("@cached getters can cache Starbeam reads through native Glimmer tags", async function (assert) {
    const count = Cell(2);

    class Derived extends Component {
      @cached
      get doubled(): number {
        return count.current * 2;
      }

      increment = () => {
        count.current += 1;
      };

      <template>
        <p data-test-doubled>{{this.doubled}}</p>
        <button type="button" data-test-increment {{on "click" this.increment}}>
          increment
        </button>
      </template>
    }

    await render(<template><Derived /></template>);
    assert.dom("[data-test-doubled]").hasText("4");

    await click("[data-test-increment]");
    assert.dom("[data-test-doubled]").hasText("6");
  });

  test("resource values can be read directly from plain getters", async function (assert) {
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
  });
});