import { isPresent } from "@starbeam/core-utils";
import type { CoreTag, Description } from "@starbeam/interfaces";
import { RUNTIME } from "@starbeam/reactive";

import { Tree } from "./tree.js";

RUNTIME;

export const debugTag = (
  tag: CoreTag,
  {
    implementation = false,
  }: { implementation?: boolean; source?: boolean; id?: boolean } = {}
): string => {
  const dependencies = [...tag.dependencies()];
  const descriptions = new Set(
    dependencies.map((dependency) =>
      getDesc(dependency.description, implementation)
    )
  );

  const nodes = [...descriptions]
    .map((d) => {
      const description = getDesc(d, implementation);
      return describe(description);
    })
    .filter(isPresent);

  return Tree(...nodes).format();
};

export const logTag = (
  tag: CoreTag,
  options: { implementation?: boolean; source?: boolean; id?: boolean } = {}
): void => {
  const debug = debugTag(tag, options);

  console.group(
    describe(tag.description, { id: options.id }),
    `(updated at ${tag.lastUpdated.toString({ format: "timestamp" })})`
  );
  console.info(debug);
  console.groupEnd();
};

function describe(
  description: Description | undefined,
  options?: { id: boolean | undefined }
): string {
  if (description) {
    return (
      RUNTIME.debug?.describe(description, options) ??
      "an unknown reactive value"
    );
  } else {
    return "an unknown reactive value";
  }
}

function getDesc(
  description: Description | undefined,
  showImplementation: boolean
): Description | undefined {
  if (showImplementation) {
    return description;
  } else {
    return RUNTIME.debug?.getUserFacing(description);
  }
}
