import type { minimal } from "@domtree/flavors";
import { getPatch } from "fast-array-diff";
import type { ReactiveMetadata } from "../../reactive/core";
import { exhaustive } from "../../strippable/assert";
import {
  RenderedContent,
  RenderedContentMetadata,
  UPDATING_METADATA,
} from "../interfaces/rendered-content";
import type { DynamicLoop, KeyedComponentInvocation } from "../list";

const MAP = Symbol("MAP");

export class InitialListArtifacts {
  static empty(): InitialListArtifacts {
    return new InitialListArtifacts();
  }

  static initialize(
    key: unknown,
    rendered: RenderedContent
  ): InitialListArtifacts {
    let artifacts = new InitialListArtifacts();
    artifacts.add(key, rendered);
    return artifacts;
  }

  readonly [MAP] = new Map<unknown, RenderedContent>();

  add(key: unknown, rendered: RenderedContent): void {
    this[MAP].set(key, rendered);
  }

  finalize(input: ReactiveMetadata): ListArtifacts {
    return ListArtifacts.create(input, this[MAP]);
  }
}

export class ListArtifacts {
  static create(
    input: ReactiveMetadata,
    map: ReadonlyMap<unknown, RenderedContent>
  ): ListArtifacts {
    let list = [...map.values()];

    if (input.isStatic) {
      return new ListArtifacts(map, list, staticRenderMetadata(list));
    } else {
      return new ListArtifacts(map, list, UPDATING_METADATA);
    }
  }

  readonly metadata: RenderedContentMetadata;
  [MAP]: ReadonlyMap<unknown, RenderedContent>;

  // @ts-expect-error TODO
  #list: readonly HydratedContent[];

  private constructor(
    map: ReadonlyMap<unknown, RenderedContent>,
    list: readonly RenderedContent[],
    metadata: RenderedContentMetadata
  ) {
    this[MAP] = map;
    this.#list = list;
    this.metadata = metadata;
  }

  #append(
    // @ts-expect-error TODO
    { before: next, key }: AppendOperation,
    components: Map<unknown, KeyedComponentInvocation>
  ) {
    // @ts-expect-error TODO
    let component = components.get(key)!;
    // component.render();
  }

  poll(loop: DynamicLoop, inside: minimal.ParentNode): void {
    let current = [...loop.current];
    let components = new Map(current.map((c) => [c.key, c]));

    let diff = this.#diff(current.map((c) => c.key));

    for (let operation of diff) {
      switch (operation.type) {
        case "add": {
          let component = components.get(operation.key)!;
          // @ts-expect-error TODO: synthesize cursor
          let before = this[MAP].get(operation.before);
          // @ts-expect-error TODO: synthesize cursor
          component.render();
          this.#append(operation, components);
        }
        case "move":
        case "remove":
      }
    }

    for (let node of this[MAP].values()) {
      node.poll(inside);
    }
  }

  #diff(newKeys: readonly unknown[]): readonly PatchOperation[] {
    let thisKeys = this[MAP].keys();
    let oldValues = [...this[MAP].values()];

    let patch = getPatch([...thisKeys], [...newKeys]);

    let removes = new Set(
      patch
        .filter((entry) => entry.type === "remove")
        .flatMap((entry) => entry.items)
    );

    let operations: PatchOperation[] = [];

    for (let entry of patch) {
      switch (entry.type) {
        case "add":
          {
            for (let [i, key] of entry.items.entries()) {
              let next = oldValues[entry.oldPos + i + 1] || null;

              if (removes.has(key)) {
                removes.delete(key);
                operations.push(MoveOperation(key, { before: next }));
              } else {
                operations.push(AppendOperation(key, { before: next }));
              }
            }
          }
          break;

        case "remove":
          // do nothing
          break;
        default:
          exhaustive(entry.type, "PatchItem");
      }
    }

    for (let remove of removes) {
      operations.push(RemoveOperation(remove));
    }

    return operations;
  }
}

/**
 * Assuming that the list's iterable is constant, what do we know about the rendered list?
 */

function staticRenderMetadata(
  list: readonly RenderedContent[]
): RenderedContentMetadata {
  if (list.length === 0) {
    return {
      isConstant: true,
      isStable: {
        firstNode: true,
        lastNode: true,
      },
    };
  }

  let first = list[0];
  let last = list[list.length - 1];

  return {
    isConstant: list.every((item) => item.metadata.isConstant),
    isStable: {
      firstNode: first.metadata.isStable.firstNode,
      lastNode: last.metadata.isStable.lastNode,
    },
  };
}

interface AppendOperation {
  readonly type: "add";
  readonly key: unknown;
  readonly before: RenderedContent | null;
}

function AppendOperation(
  key: unknown,
  { before }: { before: RenderedContent | null }
): AppendOperation {
  return {
    type: "add",
    key,
    before,
  };
}

interface RemoveOperation {
  readonly type: "remove";
  readonly key: unknown;
}

function RemoveOperation(key: unknown): RemoveOperation {
  return {
    type: "remove",
    key,
  };
}

interface MoveOperation {
  readonly type: "move";
  readonly key: unknown;
  readonly before: RenderedContent | null;
}

function MoveOperation(
  key: unknown,
  { before }: { before: RenderedContent | null }
): MoveOperation {
  return {
    type: "move",
    key,
    before,
  };
}

type PatchOperation = AppendOperation | RemoveOperation | MoveOperation;
