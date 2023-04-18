import { DEBUG } from "@starbeam/debug";
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
  return DEBUG.Desc("cell");
}

const ArrowFn = () => DEBUG.Desc("cell");
