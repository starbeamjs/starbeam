import { render, settled } from "@ember/test-helpers";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { elementResourceModifier } from "@starbeam/ember/modifier";
import { Cell } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

interface Tag {
  readonly id: string;
  readonly tagName: string;
}

function CapturedTag(element: Element) {
  return Resource(({ on: lifecycle }) => {
    const id = Cell(element.id);

    lifecycle.sync(() => {
      // Trigger a re-sync if the element ID gets mutated mid-test.
      id.set(element.id);
    });

    return {
      get id() {
        return id.current;
      },
      get tagName() {
        return element.tagName.toLowerCase();
      },
    } satisfies Tag;
  });
}

module("elementResourceModifier | rendering", function (hooks) {
  setupRenderingTest(hooks);

  test("creates a resource bound to the modified element and publishes into `into`", async function (assert) {
    class Probe extends Component {
      @tracked captured: Tag | null = null;

      attach = elementResourceModifier(CapturedTag, {
        into: (value) => (this.captured = value),
      });

      get label() {
        return this.captured
          ? `${this.captured.tagName}#${this.captured.id}`
          : "none";
      }

      <template>
        <section id="under-test" data-test-host {{this.attach}}>
          <span data-test-label>{{this.label}}</span>
        </section>
      </template>
    }

    await render(<template><Probe /></template>);
    await settled();

    assert.dom("[data-test-host]").exists();
    assert.dom("[data-test-label]").hasText("section#under-test");
  });
});
