import { Cell, RenderedValue, TIMELINE } from "@starbeam/core";
import { describe, expect, test } from "vitest";

describe("RenderedValue", () => {
  test("produces the value in the callback every time", () => {
    const name = Cell("Tom");
    const value = RenderedValue(() => name.current);

    expect(value.current).toBe("Tom");

    name.set("Thomas");

    expect(value.current).toBe("Thomas");
  });

  test("Runs the callback even if the inputs haven't changed", () => {
    const name = Cell("Tom");
    let counter = 0;
    const value = RenderedValue(() => `${++counter}: ${name.current}`);

    expect(value.current).toBe("1: Tom");
    expect(value.current).toBe("2: Tom");

    name.set("Thomas");

    expect(value.current).toBe("3: Thomas");
  });

  test("TIMELINE.render renders if the inputs change", async () => {
    const name = Cell("Tom");
    const value = RenderedValue(() => name.current);

    const rendered: string[] = [value.current];
    let afterRenderCount = 0;

    TIMELINE.render(value, () => {
      rendered.push(value.current);
    });

    TIMELINE.on.rendered(() => {
      afterRenderCount++;
    });

    expect(value.current).toBe("Tom");
    expect(rendered).toEqual(["Tom"]);
    expect(afterRenderCount).toBe(0);

    name.set("Thomas");
    await TIMELINE.nextIdle();

    expect(value.current).toBe("Thomas");
    expect(rendered).toEqual(["Tom", "Thomas"]);
    expect(afterRenderCount).toBe(1);

    name.set("Tomas");
    await TIMELINE.nextIdle();

    expect(value.current).toBe("Tomas");
    expect(rendered).toEqual(["Tom", "Thomas", "Tomas"]);
    expect(afterRenderCount).toBe(2);
  });
});
