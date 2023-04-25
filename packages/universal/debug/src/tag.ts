import { isPresent } from "@starbeam/core-utils";
import type { Description, HasTag } from "@starbeam/interfaces";
import { DEBUG, UNKNOWN_REACTIVE_VALUE } from "@starbeam/reactive";
import { getDependencies, getTag, lastUpdated } from "@starbeam/tags";

import { Tree } from "./tree.js";

export const debugTag = (
  tag: HasTag,
  {
    implementation = false,
  }: { implementation?: boolean; source?: boolean; id?: boolean } = {}
): string => {
  const dependencies = getDependencies(tag);
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
  tag: HasTag,
  options: {
    label?: string;
    implementation?: boolean;
    source?: boolean;
    id?: boolean;
  } = {}
): void => {
  const debug = debugTag(tag, options);

  if (options.label) {
    console.group(options.label);
  }

  console.group(
    describe(getTag(tag).description, { id: options.id }),
    `(updated at ${lastUpdated(tag).at})`
  );
  console.info(debug);
  console.groupEnd();

  if (options.label) {
    console.groupEnd();
  }
};

function describe(
  description: Description | undefined,
  options?: { id: boolean | undefined }
): string {
  return description && DEBUG
    ? DEBUG.describe(description, options)
    : UNKNOWN_REACTIVE_VALUE;
}

function getDesc(
  description: Description | undefined,
  showImplementation: boolean
): Description | undefined {
  return showImplementation ? description : DEBUG?.getUserFacing(description);
}
