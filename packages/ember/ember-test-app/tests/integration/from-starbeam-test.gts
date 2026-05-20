import { on } from "@ember/modifier";
import { click, render, settled } from "@ember/test-helpers";
import Component from "@glimmer/component";
import { fromStarbeam } from "@starbeam/ember";
import { Cell } from "@starbeam/reactive";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

module("fromStarbeam | rendering", function (hooks) {
  setupRenderingTest(hooks);

  test("renders the current value and re-renders when the Starbeam cell changes", async function (assert) {
    const count = Cell(1);

    class Counter extends Component {
      total = fromStarbeam(() => count.current * 2, { parent: this });

      increment = () => {
        count.current += 1;
      };

      <template>
        <p data-test-total>{{this.total.current}}</p>
        <button type="button" data-test-increment {{on "click" this.increment}}>
          increment
        </button>
      </template>
    }

    await render(<template><Counter /></template>);

    assert.dom("[data-test-total]").hasText("2", "initial computed value");

    await click("[data-test-increment]");
    assert.dom("[data-test-total]").hasText("4", "rerenders after click");

    count.current = 10;
    await settled();
    assert
      .dom("[data-test-total]")
      .hasText("20", "rerenders after out-of-component Starbeam write");
  });

  test("re-renders when used inside a derived getter and follows the active dependency", async function (assert) {
    const left = Cell(1);
    const right = Cell(10);

    class Picker extends Component {
      pick = Cell<"left" | "right">("left");

      chosen = fromStarbeam(
        () => (this.pick.current === "left" ? left.current : right.current),
        { parent: this },
      );

      get label() {
        return `${this.pick.current}=${this.chosen.current}`;
      }

      togglePick = () => {
        this.pick.current = this.pick.current === "left" ? "right" : "left";
      };

      <template>
        <p data-test-label>{{this.label}}</p>
        <button type="button" data-test-toggle {{on "click" this.togglePick}}>
          toggle
        </button>
      </template>
    }

    await render(<template><Picker /></template>);

    assert.dom("[data-test-label]").hasText("left=1");

    left.current = 2;
    await settled();
    assert.dom("[data-test-label]").hasText("left=2");

    await click("[data-test-toggle]");
    assert.dom("[data-test-label]").hasText("right=10");

    right.current = 20;
    await settled();
    assert.dom("[data-test-label]").hasText("right=20");

    // `left` is no longer in the active dependency set.
    left.current = 99;
    await settled();
    assert.dom("[data-test-label]").hasText("right=20");
  });
});
