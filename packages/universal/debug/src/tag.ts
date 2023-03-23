import { isPresent } from "@starbeam/core-utils";
import type { Tag } from "@starbeam/interfaces";

import { Tree } from "./tree.js";

export const debugTag = (
  tag: Tag,
  {
    implementation = false,
    source = false,
    id = false,
  }: { implementation?: boolean; source?: boolean; id?: boolean } = {}
): string => {
  const dependencies = [...tag.dependencies()];
  const descriptions = new Set(
    dependencies.map((dependency) => {
      return implementation
        ? dependency.description
        : dependency.description.userFacing;
    })
  );

  const nodes = [...descriptions]
    .map((d) => {
      const description = implementation ? d : d.userFacing;
      return description.describe({ source, id });
    })
    .filter(isPresent);

  return Tree(...nodes).format();
};

export const logTag = (
  tag: Tag,
  options: { implementation?: boolean; source?: boolean; id?: boolean } = {}
): void => {
  const debug = debugTag(tag, options);

  console.group(
    tag.description.describe({ id: options.id }),
    `(updated at ${tag.lastUpdated.toString({ format: "timestamp" })})`
  );
  console.log(debug);
  console.groupEnd();
};
