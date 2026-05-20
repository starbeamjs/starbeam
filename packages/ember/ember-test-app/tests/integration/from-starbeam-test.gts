import { on } from "@ember/modifier";
import { click, render, settled } from "@ember/test-helpers";
import { cached } from "@glimmer/tracking";
import { tracked } from "@glimmer/tracking";
import Component from "@glimmer/component";
import { reactive } from "@starbeam/collections";
import { fromStarbeam, type StarbeamValue } from "@starbeam/ember";
import { Cell } from "@starbeam/reactive";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

import { RecordedEvents } from "#test-helpers/recorded-events";

module("fromStarbeam | rendering", function (hooks) {
  setupRenderingTest(hooks);

  test("updates a template read when Starbeam state changes", async function (assert) {
    const count = Cell(1);

    class Counter extends Component {
      doubled = fromStarbeam(() => count.current * 2, { parent: this });

      increment = () => {
        count.current += 1;
      };

      <template>
        <p data-test-doubled>{{this.doubled.current}}</p>
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
      total = fromStarbeam(() => cart.totalCents, { parent: this });

      addBagel = () => {
        cart.add("bagel", { quantity: 2, unitCents: 250 });
      };

      <template>
        <p data-test-total>{{this.total.current}}</p>
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

      scaled = fromStarbeam(() => count.current * this.multiplier, {
        parent: this,
      });

      incrementCount = () => {
        count.current += 1;
      };

      triple = () => {
        this.multiplier = 3;
      };

      <template>
        <p data-test-scaled>{{this.scaled.current}}</p>
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

      selected = fromStarbeam(
        () =>
          this.side === "left"
            ? `left=${left.current}`
            : `right=${right.current}`,
        { parent: this },
      );

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
        <p data-test-selected>{{this.selected.current}}</p>
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

    // `left` is no longer a dependency.
    await click("[data-test-bump-left]");
    assert.dom("[data-test-selected]").hasText("right=10");

    await click("[data-test-bump-right]");
    assert.dom("[data-test-selected]").hasText("right=11");
  });

  test("can gain its first Starbeam dependency after initial render", async function (assert) {
    const count = Cell(1);

    class Toggle extends Component {
      @tracked enabled = false;

      value = fromStarbeam(
        () => (this.enabled ? `on=${count.current}` : "off"),
        { parent: this },
      );

      enable = () => {
        this.enabled = true;
      };
      increment = () => {
        count.current += 1;
      };

      <template>
        <p data-test-value>{{this.value.current}}</p>
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

    class Recorder extends Component<{ Args: { keep?: boolean } }> {
      value = fromStarbeam(
        () => {
          events.record("compute");
          return count.current;
        },
        { parent: this },
      );

      <template>
        <p data-test-value>{{this.value.current}}</p>
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

    // After teardown, mutating the cell should not trigger a recompute.
    count.current = 3;
    await settled();
    events.expect(assert, [], "no compute after unmount");
  });

  test("keeps a shared bridge live until the last consumer unmounts", async function (assert) {
    const count = Cell(1);
    const events = new RecordedEvents();

    class Consumer extends Component<{
      Args: { label: string; value: StarbeamValue<number> };
    }> {
      <template>
        <p data-test-consumer={{@label}}>{{@label}}={{@value.current}}</p>
      </template>
    }

    class Holder extends Component {
      @tracked first = true;
      @tracked second = true;

      value = fromStarbeam(
        () => {
          events.record("compute");
          return count.current;
        },
        { parent: this },
      );

      hideFirst = () => {
        this.first = false;
      };
      hideSecond = () => {
        this.second = false;
      };
      increment = () => {
        count.current += 1;
      };

      <template>
        {{#if this.first}}<Consumer @label="first" @value={{this.value}} />{{/if}}
        {{#if this.second}}<Consumer @label="second" @value={{this.value}} />{{/if}}
        <button type="button" data-test-hide-first {{on "click" this.hideFirst}}>
          hide first
        </button>
        <button type="button" data-test-hide-second {{on "click" this.hideSecond}}>
          hide second
        </button>
        <button type="button" data-test-increment {{on "click" this.increment}}>
          increment
        </button>
      </template>
    }

    await render(<template><Holder /></template>);
    assert.dom("[data-test-consumer='first']").hasText("first=1");
    assert.dom("[data-test-consumer='second']").hasText("second=1");
    events.expect(
      assert,
      ["compute"],
      "Glimmer reads the bridge once per render frame across consumers",
    );

    await click("[data-test-hide-first]");
    assert.dom("[data-test-consumer='first']").doesNotExist();
    assert.dom("[data-test-consumer='second']").hasText("second=1");

    await click("[data-test-increment]");
    assert.dom("[data-test-consumer='second']").hasText("second=2");
    events.expect(
      assert,
      ["compute"],
      "the surviving consumer drives a recompute",
    );

    await click("[data-test-hide-second]");
    assert.dom("[data-test-consumer='second']").doesNotExist();

    count.current = 99;
    await settled();
    events.expect(
      assert,
      [],
      "all consumers gone — bridge no longer recomputes",
    );
  });

  test("updates a @cached getter that reads through the bridge", async function (assert) {
    const count = Cell(2);

    class Derived extends Component {
      value = fromStarbeam(() => count.current, { parent: this });

      @cached
      get doubled(): number {
        return this.value.current * 2;
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
