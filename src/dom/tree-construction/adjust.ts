// The low-level API of Starbeam is based on HTML, and is intended to serve as a
// compiler-target for a templating engine or DSL that uses the HTML syntax.
//
// HTML semantics do not specify how to adjust attributes until tree
// construction (when we have the namespace of the parent element). Since
// components are described independently of their parent, we wait until tree
// construction to normalize attributes.
//
// It would be possible to do special-case optimizations or cache some of the
// results, if this proves to be a performance issue.
//
// If the lists passed in to Adjustments.of are too large (byte-size-wise), we
// could infer them at runtime (as needed) by using <template>, but:
//
// 1. I doubt the code would be much smaller
// 2. These lists aren't changing anymore, so they're pretty bounded
//
// We could try to find a way to automatically tree-shake SVG and MathML code if
// the app doesn't use SVG or MathML, and if this matters.

export class Adjustments {
  static of(list: string): Adjustments {
    let map: Map<string, string> = new Map();

    for (let item of list.split(",")) {
      map.set(item.toLowerCase(), item);
    }

    return new Adjustments(map);
  }

  #adjustments: Map<string, string>;

  constructor(adjustments: Map<string, string>) {
    this.#adjustments = adjustments;
  }

  adjust(key: string): string {
    if (this.#adjustments.has(key)) {
      return this.#adjustments.get(key) as string;
    } else {
      return key;
    }
  }
}

export class AdjustMap {
  static of(list: string): AdjustMap {
    let adjustments = Adjustments.of(list);
    return new AdjustMap(adjustments);
  }

  #adjustments: Adjustments;

  private constructor(adjustments: Adjustments) {
    this.#adjustments = adjustments;
  }

  adjust(map: Map<string, string>): Map<string, string> {
    let adjustments = this.#adjustments;

    let entries = [...map].map(
      ([key, value]) => [adjustments.adjust(key), value] as const
    );

    return new Map(entries);
  }
}
