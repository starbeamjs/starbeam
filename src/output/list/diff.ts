import { getPatch } from "fast-array-diff";
import { UPDATING_METADATA } from "..";
import type { DomImplementation } from "../../dom/implementation";
import type { DomTypes } from "../../dom/types";
import type { ReactiveMetadata } from "../../reactive/core";
import { exhaustive } from "../../utils";
import type { DynamicLoop, KeyedComponentInvocation } from "../list";
import type { AnyRendered, RenderMetadata } from "../program-node";

const MAP = Symbol("MAP");

export class InitialListArtifacts<T extends DomTypes> {
  static empty<T extends DomTypes>(): InitialListArtifacts<T> {
    return new InitialListArtifacts();
  }

  static initialize<T extends DomTypes>(
    key: unknown,
    rendered: AnyRendered<T>
  ): InitialListArtifacts<T> {
    let artifacts = new InitialListArtifacts<T>();
    artifacts.add(key, rendered);
    return artifacts;
  }

  readonly [MAP] = new Map<unknown, AnyRendered<T>>();

  add(key: unknown, rendered: AnyRendered<T>): void {
    this[MAP].set(key, rendered);
  }

  finalize(input: ReactiveMetadata): ListArtifacts<T> {
    return ListArtifacts.create(input, this[MAP]);
  }
}

export class ListArtifacts<T extends DomTypes> {
  static create<T extends DomTypes>(
    input: ReactiveMetadata,
    map: ReadonlyMap<unknown, AnyRendered<T>>
  ): ListArtifacts<T> {
    let list = [...map.values()];

    if (input.isStatic) {
      return new ListArtifacts(map, list, staticRenderMetadata(list));
    } else {
      return new ListArtifacts(map, list, UPDATING_METADATA);
    }
  }

  readonly metadata: RenderMetadata;
  [MAP]: ReadonlyMap<unknown, AnyRendered<T>>;
  #list: readonly AnyRendered<T>[];

  private constructor(
    map: ReadonlyMap<unknown, AnyRendered<T>>,
    list: readonly AnyRendered<T>[],
    metadata: RenderMetadata
  ) {
    this[MAP] = map;
    this.#list = list;
    this.metadata = metadata;
  }

  #append(
    { before: next, key }: AppendOperation<T>,
    components: Map<unknown, KeyedComponentInvocation<T>>
  ) {
    let component = components.get(key)!;
    component.render();
  }

  poll(dom: DomImplementation<T>, loop: DynamicLoop<T>): void {
    let current = [...loop.current];
    let components = new Map(current.map((c) => [c.key, c]));

    let diff = this.#diff(current.map((c) => c.key));

    for (let operation of diff) {
      switch (operation.type) {
        case "add": {
          let component = components.get(operation.key)!;
          let before = this[MAP].get(operation.before);
          component.render(dom);
          this.#append(operation, components);
        }
        case "move":
        case "remove":
      }
    }

    for (let node of this[MAP].values()) {
      node.poll(dom);
    }
  }

  #diff(newKeys: readonly unknown[]): readonly PatchOperation<T>[] {
    let thisKeys = this[MAP].keys();
    let oldValues = [...this[MAP].values()];

    let patch = getPatch([...thisKeys], [...newKeys]);

    let removes = new Set(
      patch
        .filter((entry) => entry.type === "remove")
        .flatMap((entry) => entry.items)
    );

    let operations: PatchOperation<T>[] = [];

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
  list: readonly AnyRendered<DomTypes>[]
): RenderMetadata {
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

interface AppendOperation<T extends DomTypes> {
  readonly type: "add";
  readonly key: unknown;
  readonly before: AnyRendered<T> | null;
}

function AppendOperation<T extends DomTypes>(
  key: unknown,
  { before }: { before: AnyRendered<T> | null }
): AppendOperation<T> {
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

interface MoveOperation<T extends DomTypes> {
  readonly type: "move";
  readonly key: unknown;
  readonly before: AnyRendered<T> | null;
}

function MoveOperation<T extends DomTypes>(
  key: unknown,
  { before }: { before: AnyRendered<T> | null }
): MoveOperation<T> {
  return {
    type: "move",
    key,
    before,
  };
}

type PatchOperation<T extends DomTypes> =
  | AppendOperation<T>
  | RemoveOperation
  | MoveOperation<T>;
