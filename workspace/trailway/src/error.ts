import type { Path } from "./paths/abstract.js";

export enum Navigation {
  Parent = "parent",
  Glob = "glob",
  File = "file",
  Dir = "dir",
}

export enum ProblemSegment {
  Dot = "`.`",
  LeadingAncestor = "leading `..`",
  InteriorAncestor = "`..`",
  Absolute = "leading `/`",
}

export class StrictNavigationError extends Error {
  constructor(
    readonly navigation: Navigation,
    readonly from: Path,
    readonly to: string,
  ) {
    const { action, code } = describeNav(navigation);

    super(
      `Attempted to ${action} to ${to} (\`${code}\`) from a strict ${
        from[Symbol.toStringTag]
      } (${
        from.relativeFromWorkspace
      }). However, the destination path is not contained in the root of the source path (${
        from.root.absolute
      }). You cannot navigate outside of the root of a strict path.`,
    );
  }
}

export class NavigationError extends Error {
  constructor(
    readonly error: {
      navigation: Navigation;
      problem: ProblemSegment;
    },
    readonly from: Path,
    readonly to: string,
  ) {
    const { action, code } = describeNav(error.navigation);

    super(
      `Attempted to ${action} (\`${code}\`) to ${to} from a ${
        from[Symbol.toStringTag]
      } (${from.toString({
        as: "description",
      })}). However, the destination path is not nested within the source path (${
        from.absolute
      }). Calls to \`${code}\` may not have ${error.problem} segments.`,
    );
  }
}

function describeNav(navigation: Navigation): { action: string; code: string } {
  switch (navigation) {
    case Navigation.Parent:
      return { action: "get the parent", code: ".parent" };
    case Navigation.Glob:
      return { action: "create a glob", code: ".glob()" };
    case Navigation.File:
      return { action: "get a nested file", code: ".file()" };
    case Navigation.Dir:
      return { action: "get a nested directory", code: ".dir()" };
  }
}
