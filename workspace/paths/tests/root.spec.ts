import { WorkspaceRoot } from "@starbeam-workspace/paths";
import { describe, expect, test } from "@starbeam-workspace/test-utils";

describe("Paths", () => {
  const paths = WorkspaceRoot.at("/tmp/workspace");

  describe("rootDir", () => {
    test("isRoot", () => {
      expect(paths.dir("packages", { as: "root" }).isRoot()).toBe(true);
    });
  });

  test("from a parent directory", () => {});
});
