import type { Description, ReactiveType } from "@starbeam/interfaces";

export type DescriptionRuntime = (
  type: ReactiveType,
  specified: string | undefined,
  create?: (desc: Description) => Description
) => Description | undefined;
