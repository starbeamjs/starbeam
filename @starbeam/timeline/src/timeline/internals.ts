import { Enum } from "@starbeam/utils";
import { REACTIVE, type ReactiveProtocol } from "./reactive.js";
import type { Timestamp } from "./timestamp.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InferReturn = any;

export interface IsUpdatedSince {
  isUpdatedSince(timestamp: Timestamp): boolean;
}

export type ReactiveInternals =
  | StaticInternals
  | CompositeInternals
  | MutableInternals;

export interface StaticInternals extends IsUpdatedSince {
  readonly type: "static";
  readonly description: string;

  children(): InternalChildren;
}

export interface CompositeInternals extends IsUpdatedSince {
  readonly type: "composite";
  readonly description: string;

  children(): InternalChildren;
}

export interface MutableInternals extends IsUpdatedSince {
  readonly type: "mutable";
  readonly description: string;
  readonly debug: { lastUpdated: Timestamp };

  children(): InternalChildren;

  isFrozen(): boolean;
  freeze(): void;
  update(): void;
  consume(): void;
}

export class InternalChildren extends Enum("None", "Children(U)")<
  MutableInternals,
  readonly ReactiveProtocol[]
> {
  static from(children: Iterable<ReactiveProtocol>): InternalChildren {
    const childList = [...children];

    if (childList.length === 0) {
      return InternalChildren.None();
    } else {
      return InternalChildren.Children(childList);
    }
  }

  get dependencies(): readonly MutableInternals[] {
    return this.match({
      None: () => [],
      Children: (children) => {
        const deps: MutableInternals[] = [];

        for (const child of children) {
          if (child[REACTIVE].type === "mutable") {
            deps.push(child[REACTIVE]);
          } else {
            deps.push(...child[REACTIVE].children().dependencies);
          }
        }

        return deps;
      },
      // children.flatMap((child) => child[REACTIVE].children().dependencies),
    });
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return this.match({
      None: () => false,
      Children: (dependencies) =>
        dependencies.some((dep) => dep[REACTIVE].isUpdatedSince(timestamp)),
    });
  }
}

export const ReactiveInternals = new (class {
  get(reactive: ReactiveProtocol): ReactiveInternals {
    return reactive[REACTIVE];
  }

  dependencies(internals: ReactiveInternals): readonly MutableInternals[] {
    return internals.children().dependencies;
  }
})();
