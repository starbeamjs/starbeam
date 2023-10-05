import type { Path } from "./paths/abstract.js";

export enum Navigation {
  Parent = "parent",
}

export class StrictNavigationError extends Error {
  constructor(
    readonly navigation: Navigation,
    readonly from: Path,
    readonly to: string,
  ) {
    super(
      `Attempted to navigate to ${to} (${navigation}) from a strict ${
        from[Symbol.toStringTag]
      } (${
        from.relativeFromWorkspace
      }). However, the destination path is not contained in the root of the source path (${
        from.root.absolute
      }). You cannot navigate outside of the root of a strict path.`,
    );
  }
}
