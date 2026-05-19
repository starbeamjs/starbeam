// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-magic-numbers */

import { Cell } from "@starbeam/universal";
import {
  describe,
  expect,
  RecordedEvents,
  test,
} from "@starbeam-workspace/test-utils";
import { fireEvent, render } from "@testing-library/svelte";
import { tick } from "svelte";

import FromStarbeamBasic from "./fixtures/FromStarbeamBasic.svelte";
import FromStarbeamCleanup from "./fixtures/FromStarbeamCleanup.svelte";
import FromStarbeamDerived from "./fixtures/FromStarbeamDerived.svelte";
import FromStarbeamDomainGetter from "./fixtures/FromStarbeamDomainGetter.svelte";
import FromStarbeamDynamicDependency from "./fixtures/FromStarbeamDynamicDependency.svelte";
import FromStarbeamEffect from "./fixtures/FromStarbeamEffect.svelte";
import FromStarbeamMixedState from "./fixtures/FromStarbeamMixedState.svelte";
import FromStarbeamMultipleConsumers from "./fixtures/FromStarbeamMultipleConsumers.svelte";
import FromStarbeamZeroDependency from "./fixtures/FromStarbeamZeroDependency.svelte";

function html(element: Element): string {
  return element.innerHTML.replace(/>\s+</g, "><");
}

describe("fromStarbeam", () => {
  test("updates a template read when Starbeam state changes", async () => {
    const count = Cell(1);
    const result = render(FromStarbeamBasic, { props: { count } });

    expect(html(result.container)).toBe("<p>2</p><button>increment</button>");

    await fireEvent.click(result.getByRole("button", { name: "increment" }));
    await tick();

    expect(html(result.container)).toBe("<p>4</p><button>increment</button>");

    result.unmount();
  });

  test("reads a domain-shaped getter over private Starbeam storage", async () => {
    const result = render(FromStarbeamDomainGetter);

    expect(html(result.container)).toBe("<p>300</p><button>add bagel</button>");

    await fireEvent.click(result.getByRole("button", { name: "add bagel" }));
    await tick();

    expect(html(result.container)).toBe("<p>800</p><button>add bagel</button>");

    result.unmount();
  });

  test("updates when Svelte state used by the Starbeam compute changes", async () => {
    const count = Cell(2);
    const result = render(FromStarbeamMixedState, { props: { count } });

    expect(html(result.container)).toBe(
      "<p>4</p><button>increment count</button><button>triple</button>",
    );

    await fireEvent.click(result.getByRole("button", { name: "triple" }));
    await tick();

    expect(html(result.container)).toBe(
      "<p>6</p><button>increment count</button><button>triple</button>",
    );

    await fireEvent.click(
      result.getByRole("button", { name: "increment count" }),
    );
    await tick();

    expect(html(result.container)).toBe(
      "<p>9</p><button>increment count</button><button>triple</button>",
    );

    result.unmount();
  });

  test("refreshes dynamic Starbeam dependencies", async () => {
    const left = Cell(1);
    const right = Cell(10);
    const result = render(FromStarbeamDynamicDependency, {
      props: { left, right },
    });

    expect(html(result.container)).toBe(
      "<p>left=1</p><button>choose right</button><button>bump left</button><button>bump right</button>",
    );

    await fireEvent.click(result.getByRole("button", { name: "choose right" }));
    await tick();

    expect(html(result.container)).toBe(
      "<p>right=10</p><button>choose right</button><button>bump left</button><button>bump right</button>",
    );

    await fireEvent.click(result.getByRole("button", { name: "bump left" }));
    await tick();

    expect(html(result.container)).toBe(
      "<p>right=10</p><button>choose right</button><button>bump left</button><button>bump right</button>",
    );

    await fireEvent.click(result.getByRole("button", { name: "bump right" }));
    await tick();

    expect(html(result.container)).toBe(
      "<p>right=11</p><button>choose right</button><button>bump left</button><button>bump right</button>",
    );

    result.unmount();
  });

  test("can gain its first Starbeam dependency after initial render", async () => {
    const count = Cell(1);
    const result = render(FromStarbeamZeroDependency, { props: { count } });

    expect(html(result.container)).toBe(
      "<p>off</p><button>enable</button><button>increment</button>",
    );

    await fireEvent.click(result.getByRole("button", { name: "enable" }));
    await tick();

    expect(html(result.container)).toBe(
      "<p>on=1</p><button>enable</button><button>increment</button>",
    );

    await fireEvent.click(result.getByRole("button", { name: "increment" }));
    await tick();

    expect(html(result.container)).toBe(
      "<p>on=2</p><button>enable</button><button>increment</button>",
    );

    result.unmount();
  });

  test("stops recomputing after unmount", async () => {
    const count = Cell(1);
    const events = new RecordedEvents();
    const result = render(FromStarbeamCleanup, { props: { count, events } });

    expect(html(result.container)).toBe("<p>1</p>");
    events.expect("compute");

    count.current++;
    await tick();

    expect(html(result.container)).toBe("<p>2</p>");
    events.expect("compute");

    result.unmount();
    await tick();

    count.current++;
    await tick();

    events.expect();
  });

  test("keeps a shared bridge live until the last consumer unmounts", async () => {
    const count = Cell(1);
    const events = new RecordedEvents();
    const result = render(FromStarbeamMultipleConsumers, {
      props: { count, events },
    });

    expect(html(result.container)).toBe(
      "<button>hide first</button><button>hide second</button><button>increment</button><p>first=1</p><!----><p>second=1</p><!---->",
    );
    events.expect("compute", "compute");

    await fireEvent.click(result.getByRole("button", { name: "hide first" }));
    await tick();

    expect(html(result.container)).toBe(
      "<button>hide first</button><button>hide second</button><button>increment</button><!----><p>second=1</p><!---->",
    );
    events.expect();

    await fireEvent.click(result.getByRole("button", { name: "increment" }));
    await tick();

    expect(html(result.container)).toBe(
      "<button>hide first</button><button>hide second</button><button>increment</button><!----><p>second=2</p><!---->",
    );
    events.expect("compute");

    await fireEvent.click(result.getByRole("button", { name: "hide second" }));
    await tick();

    expect(html(result.container)).toBe(
      "<button>hide first</button><button>hide second</button><button>increment</button><!----><!---->",
    );
    events.expect();

    await fireEvent.click(result.getByRole("button", { name: "increment" }));
    await tick();

    events.expect();

    result.unmount();
  });

  test("updates a Svelte $derived consumer", async () => {
    const count = Cell(2);
    const result = render(FromStarbeamDerived, { props: { count } });

    expect(html(result.container)).toBe("<p>4</p><button>increment</button>");

    await fireEvent.click(result.getByRole("button", { name: "increment" }));
    await tick();

    expect(html(result.container)).toBe("<p>6</p><button>increment</button>");

    result.unmount();
  });

  test("updates a Svelte $effect consumer", async () => {
    const count = Cell(2);
    const events = new RecordedEvents();
    const result = render(FromStarbeamEffect, { props: { count, events } });

    await tick();

    expect(html(result.container)).toBe("<p>4</p><button>increment</button>");
    events.expect("effect:4");

    await fireEvent.click(result.getByRole("button", { name: "increment" }));
    await tick();

    expect(html(result.container)).toBe("<p>6</p><button>increment</button>");
    events.expect("effect:6");

    result.unmount();
  });
});
