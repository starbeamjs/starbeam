// @vitest-environment jsdom

import { setupResource } from "@starbeam/vue";
import { describe, test, TestResource } from "@starbeam-workspace/test-utils";
import { define } from "@starbeam-workspace/vue-testing-utils";
import { h } from "vue";

describe("resources", () => {
  test("resources are cleaned up correctly", async () => {
    const { resource: TestResourceBlueprint, id, events } = TestResource();

    const result = define({
      setup: () => {
        const test = setupResource(TestResourceBlueprint);
        return () => h("p", ["hello ", test.id]);
      },
    })
      .html(({ id }) => `<p>hello ${id}</p>`, { id })
      .render();

    await result.rerender({}, { id: 0 });

    result.unmount();
  });
});
