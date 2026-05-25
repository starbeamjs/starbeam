import { destroy } from "@ember/destroyable";
import { getOwner } from "@ember/owner";
import { clearRender, render, settled } from "@ember/test-helpers";
import Component from "@glimmer/component";
import { setupService, useService } from "@starbeam/ember";
import { Resource } from "@starbeam/resource";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

module("setupService | rendering", function (hooks) {
  setupRenderingTest(hooks);

  test("setupService shares service instances for the same owner", async function (assert) {
    let setups = 0;

    const Counter = Resource(() => {
      let count = ++setups;

      return {
        get count() {
          return count;
        },
        increment() {
          count += 1;
        },
      };
    });

    class Display extends Component {
      first = setupService(Counter, getOwner(this));
      second = setupService(Counter, getOwner(this));

      <template>
        <p data-test-first>{{this.first.count}}</p>
        <p data-test-second>{{this.second.count}}</p>
      </template>
    }

    await render(<template><Display /></template>);

    assert.strictEqual(setups, 1, "service was set up once");
    assert.dom("[data-test-first]").hasText("1");
    assert.dom("[data-test-second]").hasText("1");
  });

  test("useService uses the component's owner as the app scope", async function (assert) {
    let setups = 0;

    const Counter = Resource(() => {
      let count = ++setups;

      return {
        get count() {
          return count;
        },
        increment() {
          count += 1;
        },
      };
    });

    class Display extends Component {
      first = useService(this, Counter);
      second = useService(this, Counter);

      <template>
        <p data-test-first>{{this.first.count}}</p>
        <p data-test-second>{{this.second.count}}</p>
      </template>
    }

    await render(<template><Display /></template>);

    assert.strictEqual(setups, 1, "service was set up once");
    assert.dom("[data-test-first]").hasText("1");
    assert.dom("[data-test-second]").hasText("1");
  });

  test("setupService has owner lifetime, not component lifetime", async function (assert) {
    let finalizes = 0;

    const Session = Resource(({ on }) => {
      on.lowLevel.finalize(() => {
        finalizes += 1;
      });

      return {};
    });

    class Display extends Component {
      session = useService(this, Session);

      <template>
        {{this.session}}
      </template>
    }

    await render(<template><Display /></template>);
    assert.strictEqual(finalizes, 0, "service is active");

    await clearRender();
    assert.strictEqual(
      finalizes,
      0,
      "component teardown does not finalize owner-scoped service",
    );

    destroy(this.owner);
    await settled();
    assert.strictEqual(finalizes, 1, "owner teardown finalizes service");
  });
});
