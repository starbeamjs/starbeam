import { on } from "@ember/modifier";
import { click, render, settled } from "@ember/test-helpers";
import { cached } from "@glimmer/tracking";
import { tracked } from "@glimmer/tracking";
import Component from "@glimmer/component";
import { reactive as collections } from "@starbeam/collections";
import { reactive } from "@starbeam/ember/decorators";
import { Cell } from "@starbeam/reactive";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

import { RecordedEvents } from "#test-helpers/recorded-events";

module("@reactive | rendering", function (hooks) {
  setupRenderingTest(hooks);

  test("updates a template read when Starbeam state changes", async function (assert) {
    const count = Cell(1);

    class Counter extends Component {
      @reactive
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

  test("reads a domain-shaped getter over private Starbeam storage", async function (assert) {
    interface LineItem {
      readonly quantity: number;
      readonly unitCents: number;
    }

    class Cart {
      readonly #items = collections.Map<string, LineItem>();

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
      @reactive
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

  test("updates when @tracked state used by the Starbeam compute changes", async function (assert) {
    const count = Cell(2);

    class Mixed extends Component {
      @tracked multiplier = 2;

      @reactive
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
      .hasText("9", "rerenders when the starbeam cell changes");
  });

  test("refreshes dynamic Starbeam dependencies", async function (assert) {
    const left = Cell(1);
    const right = Cell(10);

    class Picker extends Component {
      @tracked side: "left" | "right" = "left";

      @reactive
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

  test("can gain its first Starbeam dependency after initial render", async function (assert) {
    const count = Cell(1);

    class Toggle extends Component {
      @tracked enabled = false;

      @reactive
      get value(): string {
        return this.enabled ? `on=${count.current}` : "off";
      }

      enable = () => {
        this.enabled = true;
      };
      increment = () => {
        count.current += 1;
      };

      <template>
        <p data-test-value>{{this.value}}</p>
        <button type="button" data-test-enable {{on "click" this.enable}}>
          enable
        </button>
        <button type="button" data-test-increment {{on "click" this.increment}}>
          increment
        </button>
      </template>
    }

    await render(<template><Toggle /></template>);
    assert.dom("[data-test-value]").hasText("off");

    await click("[data-test-enable]");
    assert.dom("[data-test-value]").hasText("on=1");

    await click("[data-test-increment]");
    assert.dom("[data-test-value]").hasText("on=2");
  });

  test("stops recomputing after the component is torn down", async function (assert) {
    const count = Cell(1);
    const events = new RecordedEvents();

    class Recorder extends Component {
      @reactive
      get value(): number {
        events.record("compute");
        return count.current;
      }

      <template>
        <p data-test-value>{{this.value}}</p>
      </template>
    }

    class Toggle extends Component {
      @tracked visible = true;
      hide = () => {
        this.visible = false;
      };

      <template>
        {{#if this.visible}}<Recorder />{{/if}}
        <button type="button" data-test-hide {{on "click" this.hide}}>hide</button>
      </template>
    }

    await render(<template><Toggle /></template>);
    assert.dom("[data-test-value]").hasText("1");
    events.expect(assert, ["compute"], "computed once on first render");

    count.current = 2;
    await settled();
    assert.dom("[data-test-value]").hasText("2");
    events.expect(assert, ["compute"], "recomputes when the cell changes");

    await click("[data-test-hide]");
    assert.dom("[data-test-value]").doesNotExist();

    count.current = 3;
    await settled();
    events.expect(assert, [], "no compute after unmount");
  });

  test("updates a @cached getter that reads through the decorator", async function (assert) {
    const count = Cell(2);

    class Derived extends Component {
      @reactive
      get value(): number {
        return count.current;
      }

      @cached
      get doubled(): number {
        return this.value * 2;
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
});
