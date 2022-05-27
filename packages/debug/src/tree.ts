const VBAR = "│";
const NEXT = "├";
const LAST = "╰";

type RootNode = Node[];
type Leaf = string;
type ParentNode = [label: string, ...children: Node[]];
type Node = Leaf | ParentNode;

export class Root {
  #root: RootNode;

  constructor(root: RootNode) {
    this.#root = root;
  }

  format() {
    return formatChildren(this.#root, { depth: 0 });
  }
}

export function Tree(...root: RootNode): Root {
  return new Root(root);
}

function formatNode(
  node: Node,
  { depth, isLast }: { depth: number; isLast: boolean }
): string {
  if (typeof node === "string") {
    return formatLeaf(node, { depth, isLast });
  } else {
    return formatParent(node, { depth, isLast });
  }
}

function formatChildren(
  children: Node[],
  { depth }: { depth: number }
): string {
  return children
    .map((child, index) => {
      const isLast = index === children.length - 1;
      return formatNode(child, { depth, isLast });
    })
    .join("\n");
}

function formatParent(
  [label, ...children]: ParentNode,
  { depth, isLast }: { depth: number; isLast: boolean }
): string {
  const title = `${prefix({ depth, isLast: false })} ${label}`;

  return `${title}\n${formatChildren(children, { depth: depth + 1 })}`;
}

function formatLeaf(
  value: string,
  { depth, isLast }: { depth: number; isLast: boolean }
): string {
  return `${prefix({ depth, isLast })} ${value}`;
}

function indent(depth: number) {
  return `${VBAR} `.repeat(depth);
}

function prefix({ depth, isLast }: { depth: number; isLast: boolean }) {
  if (isLast) {
    return `${indent(depth)}${LAST}`;
  } else {
    return `${indent(depth)}${NEXT}`;
  }
}

/**
 * Source material:
 * 
 * https://github.com/zkat/miette/blob/1a36fa7ec80de77e910e04cdb902270970611b39/src/handlers/theme.rs
 *         Self {
            hbar: '─',
            vbar: '│',
            xbar: '┼',
            vbar_break: '·',
            uarrow: '▲',
            rarrow: '▶',
            ltop: '╭',
            mtop: '┬',
            rtop: '╮',
            lbot: '╰',
            mbot: '┴',
            rbot: '╯',
            lbox: '[',
            rbox: ']',
            lcross: '├',
            rcross: '┤',
            underbar: '┬',
            underline: '─',
            error: "💥".into(),
            warning: "⚠️".into(),
            advice: "💡".into(),
        }
 */
