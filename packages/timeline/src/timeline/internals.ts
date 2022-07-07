// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ifDebug } from "@starbeam/debug";
import { REACTIVE } from "@starbeam/peer";

import type { MutableInternals, ReactiveProtocol } from "./reactive.js";
import { Timestamp } from "./timestamp.js";

export interface IsUpdatedSince {
  isUpdatedSince(timestamp: Timestamp): boolean;
}

type InternalChildrenEnum =
  | { type: "None" }
  | { type: "Children"; children: readonly ReactiveProtocol[] };

export class InternalChildren {
  static None(): InternalChildren {
    return new InternalChildren({ type: "None" });
  }

  static Children(children: readonly ReactiveProtocol[]): InternalChildren {
    return InternalChildren.from(children);
  }

  static from(children: readonly ReactiveProtocol[]) {
    const childList = [...children].filter((child) => {
      const reactive = child[REACTIVE];
      return reactive.type !== "mutable" || reactive.isFrozen() === false;
    });

    if (childList.length === 0) {
      return InternalChildren.None();
    } else {
      return new InternalChildren({
        type: "Children",
        children: childList,
      });
    }
  }

  #internal: InternalChildrenEnum;

  constructor(children: InternalChildrenEnum) {
    this.#internal = children;
  }

  get dependencies(): Set<MutableInternals> {
    switch (this.#internal.type) {
      case "None":
        return new Set();

      case "Children": {
        const children = this.#internal.children.flatMap(
          (child): readonly MutableInternals[] => {
            const internals = child[REACTIVE];
            if (internals.type === "mutable") {
              if (!internals.isFrozen()) {
                return [internals];
              }
            } else {
              return [...child[REACTIVE].children().dependencies];
            }

            return [];
          }
        );

        return new Set(children);
      }
    }
  }

  @ifDebug
  get lastUpdated(): Timestamp {
    switch (this.#internal.type) {
      case "None":
        return Timestamp.now();
      case "Children":
        return this.#internal.children
          .map((child) => child[REACTIVE].debug.lastUpdated)
          .reduce(
            (max, child) => (child.gt(max) ? child : max),
            Timestamp.zero()
          );
    }
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    switch (this.#internal.type) {
      case "None":
        return false;
      case "Children":
        return this.#internal.children.some((child) =>
          child[REACTIVE].isUpdatedSince(timestamp)
        );
    }
  }
}
