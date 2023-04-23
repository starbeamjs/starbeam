// @vitest-environment jsdom

import { create } from "@starbeam/vue";
import {
  describe,
  expect,
  resources,
  test,
  TestResource,
} from "@starbeam-workspace/test-utils";
import { define } from "@starbeam-workspace/vue-testing-utils";
import { h } from "vue";

describe("resources", () => {
  test("resources are cleaned up correctly", () => {
    const result = define({
      setup: () => {
        const test = create(TestResource);
        return () => h("p", ["hello ", test.value.id]);
      },
    })
      .html(({ id }) => `<p>hello ${id}</p>`, { id: resources.nextId })
      .render();

    result.unmount();

    expect(resources.last.isActive).toBe(false);
  });
});
