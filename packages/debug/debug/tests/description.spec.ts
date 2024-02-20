import { DEBUG } from "@starbeam/debug";
import { expect, test } from "@starbeam-workspace/test-utils";

test("inferred api", () => {
  if (import.meta.env.DEV) {
    expect(SomeAPI()?.api).toMatchObject({
      type: "simple",
      name: "SomeAPI",
    });

    expect(ArrowFn()?.api).toMatchObject({
      type: "simple",
      name: "ArrowFn",
    });
  } else {
    expect(SomeAPI()?.api).toBe(undefined);
    expect(ArrowFn()?.api).toBe(undefined);
  }
});

function SomeAPI() {
  return DEBUG.Desc("cell");
}

const ArrowFn = () => DEBUG.Desc("cell");
