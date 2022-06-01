import {
  type MutableInternals,
  type ReactiveProtocol,
  REACTIVE,
} from "./reactive.js";
import type { Timestamp } from "./timestamp.js";

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

  #enum: InternalChildrenEnum;

  constructor(children: InternalChildrenEnum) {
    this.#enum = children;
  }

  get dependencies(): readonly MutableInternals[] {
    switch (this.#enum.type) {
      case "None":
        return [];

      case "Children":
        return this.#enum.children.flatMap((child) => {
          if (child[REACTIVE].type === "mutable") {
            if (!child[REACTIVE].isFrozen()) {
              return child[REACTIVE].children().dependencies;
            }
          } else {
            return child[REACTIVE].children().dependencies;
          }

          return [];
        });
    }
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    switch (this.#enum.type) {
      case "None":
        return false;
      case "Children":
        return this.#enum.children.some((child) =>
          child[REACTIVE].isUpdatedSince(timestamp)
        );
    }
  }
}
