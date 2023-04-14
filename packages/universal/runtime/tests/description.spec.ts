import { RUNTIME } from "@starbeam/reactive";
import { expect, test } from "@starbeam-workspace/test-utils";

test("inferred api", () => {
  expect(SomeAPI()?.api).toMatchObject({
    type: "simple",
    name: "SomeAPI",
  });

  expect(ArrowFn()?.api).toMatchObject({
    type: "simple",
    name: "ArrowFn",
  });
});

function SomeAPI() {
  return RUNTIME.Desc?.("cell");
}

const ArrowFn = () => RUNTIME.Desc?.("cell");
