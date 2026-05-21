import { on } from "@ember/modifier";
import { click, render, settled } from "@ember/test-helpers";
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import {
  elementResource,
  elementResourceModifier,
} from "@starbeam/ember/modifier";
import { Marker } from "@starbeam/reactive";
import { Cell } from "@starbeam/reactive";
import { Resource } from "@starbeam/resource";
import { setupRenderingTest } from "ember-qunit";
import { module, test } from "qunit";

import { RecordedEvents } from "#test-helpers/recorded-events";

interface Size {
  readonly width: number;
}

interface ElementInfo {
  readonly elementId: string;
  readonly width: number;
}

const INITIAL_WIDTH = 0;

function ElementSizeBlueprint(
  events: RecordedEvents,
  marker: ReturnType<typeof Marker>,
) {
  return (element: HTMLElement) =>
    Resource(({ on: lifecycle }) => {
      const width = Cell(INITIAL_WIDTH);
      events.record("size:attached");

      lifecycle.sync(() => {
        events.record("size:sync");
        marker.read();
        width.set(Number(element.dataset["width"] ?? INITIAL_WIDTH));
      });

      lifecycle.finalize(() => {
        events.record("size:finalize");
      });

      return {
        get width() {
          return width.current;
        },
      } satisfies Size;
    });
}

function display(size: Size | null): string {
  return size ? `width=${size.width}` : "pending";
}

function ElementInfoBlueprint(events: RecordedEvents) {
  return (element: HTMLElement) =>
    Resource(({ on: lifecycle }) => {
      const width = Cell(INITIAL_WIDTH);
      const elementId = element.dataset["id"] ?? "unknown";
      events.record(`info:attached:${elementId}`);

      lifecycle.sync(() => {
        events.record(`info:sync:${elementId}`);
        width.set(Number(element.dataset["width"] ?? INITIAL_WIDTH));
      });

      lifecycle.finalize(() => {
        events.record(`info:finalize:${elementId}`);
      });

      return {
        elementId,
        get width() {
          return width.current;
        },
      } satisfies ElementInfo;
    });
}

function infoDisplay(info: ElementInfo | null): string {
  return info ? `${info.elementId}:${info.width}` : "pending";
}

module("elementResource | rendering", function (hooks) {
  setupRenderingTest(hooks);

  test("modifier publishes a domain-shaped value into a @tracked sink", async function (assert) {
    const events = new RecordedEvents();
    const marker = Marker();

    class Probe extends Component {
      @tracked size: Size | null = null;
      @tracked width = "100";

      attach = elementResourceModifier(ElementSizeBlueprint(events, marker), {
        into: (value) => (this.size = value),
      });

      get label(): string {
        return display(this.size);
      }

      grow = () => {
        this.width = "101";
      };

      <template>
        <p data-test-size>{{this.label}}</p>
        <button type="button" data-test-grow {{on "click" this.grow}}>grow</button>
        <div data-test-box data-width={{this.width}} {{this.attach}}>box</div>
      </template>
    }

    await render(<template><Probe /></template>);
    await settled();
    assert.dom("[data-test-size]").hasText("width=100");
    events.expect(
      assert,
      ["size:attached", "size:sync"],
      "attached + initial sync",
    );

    await click("[data-test-grow]");
    // The cell tag inside ElementSize hasn't been marked yet, so the resource
    // hasn't resynced. The DOM data-width changes, but the published `size`
    // still reflects the previous read.
    assert.dom("[data-test-box]").hasAttribute("data-width", "101");
    assert.dom("[data-test-size]").hasText("width=100");
    events.expect(assert, [], "no sync until the resource marks itself dirty");

    marker.mark();
    await settled();
    assert.dom("[data-test-size]").hasText("width=101");
    events.expect(assert, ["size:sync"], "resync after marker invalidation");
  });

  test("modifier positional args trigger a fresh element resource", async function (assert) {
    const events = new RecordedEvents();

    class Probe extends Component {
      @tracked size: ElementInfo | null = null;
      @tracked width = "100";

      attach = elementResourceModifier(ElementInfoBlueprint(events), {
        into: (value) => (this.size = value),
      });

      get args() {
        return [this.width];
      }

      get label(): string {
        return infoDisplay(this.size);
      }

      grow = () => {
        this.width = "101";
      };

      <template>
        <p data-test-size>{{this.label}}</p>
        <button type="button" data-test-grow {{on "click" this.grow}}>grow</button>
        <div
          data-test-box
          data-id="positional"
          data-width={{this.width}}
          {{this.attach this.width}}
        >box</div>
      </template>
    }

    await render(<template><Probe /></template>);
    await settled();
    assert.dom("[data-test-size]").hasText("positional:100");
    events.expect(assert, ["info:attached:positional", "info:sync:positional"]);

    await click("[data-test-grow]");
    await settled();
    assert.dom("[data-test-size]").hasText("positional:101");
    events.expect(assert, [
      "info:finalize:positional",
      "info:attached:positional",
      "info:sync:positional",
    ]);
  });

  test("modifier named args trigger a fresh element resource", async function (assert) {
    const events = new RecordedEvents();

    class Probe extends Component {
      @tracked size: ElementInfo | null = null;
      @tracked width = "100";

      attach = elementResourceModifier(ElementInfoBlueprint(events), {
        into: (value) => (this.size = value),
      });

      get args() {
        return { width: this.width };
      }

      get label(): string {
        return infoDisplay(this.size);
      }

      grow = () => {
        this.width = "101";
      };

      <template>
        <p data-test-size>{{this.label}}</p>
        <button type="button" data-test-grow {{on "click" this.grow}}>grow</button>
        <div
          data-test-box
          data-id="named"
          data-width={{this.width}}
          {{this.attach width=this.width}}
        >box</div>
      </template>
    }

    await render(<template><Probe /></template>);
    await settled();
    assert.dom("[data-test-size]").hasText("named:100");
    events.expect(assert, ["info:attached:named", "info:sync:named"]);

    await click("[data-test-grow]");
    await settled();
    assert.dom("[data-test-size]").hasText("named:101");
    events.expect(assert, [
      "info:finalize:named",
      "info:attached:named",
      "info:sync:named",
    ]);
  });

  test("modifier element replacement creates a fresh element resource", async function (assert) {
    const events = new RecordedEvents();

    class Probe extends Component {
      @tracked first = true;
      @tracked size: ElementInfo | null = null;

      attach = elementResourceModifier(ElementInfoBlueprint(events), {
        into: (value) => (this.size = value),
      });

      get label(): string {
        return infoDisplay(this.size);
      }

      replace = () => {
        this.first = false;
      };

      <template>
        <p data-test-size>{{this.label}}</p>
        <button type="button" data-test-replace {{on "click" this.replace}}>replace</button>
        {{#if this.first}}
          <div data-test-box data-id="first" data-width="100" {{this.attach}}>first</div>
        {{else}}
          <section data-test-box data-id="second" data-width="200" {{this.attach}}>second</section>
        {{/if}}
      </template>
    }

    await render(<template><Probe /></template>);
    await settled();
    assert.dom("[data-test-size]").hasText("first:100");
    events.expect(assert, ["info:attached:first", "info:sync:first"]);

    await click("[data-test-replace]");
    await settled();
    assert.dom("[data-test-size]").hasText("second:200");
    events.expect(assert, [
      "info:attached:second",
      "info:sync:second",
      "info:finalize:first",
    ]);
  });

  test("modifier finalizes when its element is removed", async function (assert) {
    const events = new RecordedEvents();
    const marker = Marker();

    class Toggle extends Component {
      @tracked visible = true;
      @tracked size: Size | null = null;

      attach = elementResourceModifier(ElementSizeBlueprint(events, marker), {
        into: (value) => (this.size = value),
      });

      get label(): string {
        return display(this.size);
      }

      hide = () => {
        this.visible = false;
      };

      <template>
        <p data-test-size>{{this.label}}</p>
        <button type="button" data-test-hide {{on "click" this.hide}}>hide</button>
        {{#if this.visible}}
          <div data-test-box data-width="100" {{this.attach}}>box</div>
        {{/if}}
      </template>
    }

    await render(<template><Toggle /></template>);
    await settled();
    assert.dom("[data-test-size]").hasText("width=100");
    events.expect(assert, ["size:attached", "size:sync"]);

    await click("[data-test-hide]");
    assert.dom("[data-test-box]").doesNotExist();
    assert.dom("[data-test-size]").hasText("pending");
    events.expect(
      assert,
      ["size:finalize"],
      "removing the element finalizes the resource and clears the sink",
    );

    // After finalize, marking the marker should not resurrect the resource.
    marker.mark();
    await settled();
    events.expect(assert, []);
  });

  test("elementResource() exposes both a modifier and a tracked .current", async function (assert) {
    const events = new RecordedEvents();
    const marker = Marker();

    class Handle extends Component {
      size = elementResource(ElementSizeBlueprint(events, marker));
      @tracked width = "100";

      get label(): string {
        return display(this.size.current);
      }

      grow = () => {
        this.width = "101";
      };

      <template>
        <p data-test-size>{{this.label}}</p>
        <button type="button" data-test-grow {{on "click" this.grow}}>grow</button>
        <div data-test-box data-width={{this.width}} {{this.size.modifier}}>box</div>
      </template>
    }

    await render(<template><Handle /></template>);
    await settled();
    assert.dom("[data-test-size]").hasText("width=100");
    events.expect(assert, ["size:attached", "size:sync"]);

    await click("[data-test-grow]");
    assert.dom("[data-test-size]").hasText("width=100");
    events.expect(assert, []);

    marker.mark();
    await settled();
    assert.dom("[data-test-size]").hasText("width=101");
    events.expect(assert, ["size:sync"]);
  });

  test("elementResource() clears .current when the element is removed", async function (assert) {
    const events = new RecordedEvents();
    const marker = Marker();

    class Toggle extends Component {
      @tracked visible = true;
      size = elementResource(ElementSizeBlueprint(events, marker));

      get label(): string {
        return display(this.size.current);
      }

      hide = () => {
        this.visible = false;
      };

      <template>
        <p data-test-size>{{this.label}}</p>
        <button type="button" data-test-hide {{on "click" this.hide}}>hide</button>
        {{#if this.visible}}
          <div data-test-box data-width="100" {{this.size.modifier}}>box</div>
        {{/if}}
      </template>
    }

    await render(<template><Toggle /></template>);
    await settled();
    assert.dom("[data-test-size]").hasText("width=100");
    events.expect(assert, ["size:attached", "size:sync"]);

    await click("[data-test-hide]");
    assert.dom("[data-test-box]").doesNotExist();
    assert.dom("[data-test-size]").hasText("pending");
    events.expect(assert, ["size:finalize"]);
  });
});
