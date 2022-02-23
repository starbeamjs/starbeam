declare module "treeify" {
  export interface TreeObject {}

  function asTree(
    tree: TreeObject,
    showValues: boolean,
    hideFunctions?: boolean
  ): string;

  const DEFAULT: { asTree: typeof asTree };
  export default DEFAULT;
}
