// Type definitions for treeify 1.0
// Project: https://github.com/notatestuser/treeify
// Definitions by: Mike North <https://github.com/mike-north>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.1

export interface TreeObject {
  [k: string]: TreeValue;
}
export type TreeValue = string | TreeObject;

declare function asTree(
  treeObj: TreeObject,
  showValues: boolean,
  hideFunctions: boolean
): string;

declare function asLines(
  treeObj: TreeObject,
  showValues: boolean,
  lineCallback: (line: string) => void
): string;

declare function asLines(
  treeObj: TreeObject,
  showValues: boolean,
  hideFunctions: boolean,
  lineCallback: (line: string) => void
): string;

declare const DEFAULT: { asTree: typeof asTree; asLines: typeof asLines };

export default DEFAULT;
