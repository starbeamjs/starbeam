import { LIFETIME } from "../core/lifetime/lifetime.js";
import type { ReactiveMetadata } from "../core/metadata.js";
import type { Reactive } from "../fundamental/types.js";
import { HookBlueprint, SimpleHook } from "../hooks/simple.js";
import type { Hook } from "../root/api/public.js";
import { assert } from "../strippable/core.js";
import { LOGGER } from "../strippable/trace.js";
import type { AnyKey } from "../strippable/wrapper.js";
import type { Root } from "../universe.js";
import { AbstractProgramNode, RenderedProgramNode } from "./program-node.js";

const UNINITIALIZED = Symbol("UNINITIALIZED");

/**
 * This value is a sink for hooks. Importantly, if you finalize this value, its
 * source will also be finalized.
 */
export class HookValue<T = unknown> {
  static create<T>(): HookValue<T> {
    return new HookValue<T>(UNINITIALIZED);
  }

  /** @internal */
  static update<T>(slot: HookValue<T>, value: T): void {
    slot.#value = value;
  }

  #value: T | typeof UNINITIALIZED;

  constructor(value: T | typeof UNINITIALIZED) {
    this.#value = value;
  }

  get current(): T {
    assert(
      this.#value !== UNINITIALIZED,
      `A top-level hook value cannot be observed before the app was rendered`
    );

    return this.#value;
  }
}

export type HookContainer = Record<AnyKey, HookValue>;

export class HookCursor {
  static create(): HookCursor {
    return new HookCursor();
  }
}

export class HookProgramNode<T> extends AbstractProgramNode<
  HookCursor,
  HookValue
> {
  static create<T>(universe: Root, hook: HookBlueprint<T>): HookProgramNode<T> {
    return new HookProgramNode(universe, SimpleHook.construct(hook));
  }

  readonly #universe: Root;
  readonly #hook: Reactive<Hook>;

  private constructor(universe: Root, hook: Reactive<Hook<T>>) {
    super();
    this.#universe = universe;
    this.#hook = hook;
  }

  get metadata(): ReactiveMetadata {
    return this.#hook.metadata;
  }

  render(): RenderedProgramNode<HookValue<T>> {
    return RenderedHook.create(this.#universe, this.#hook);
  }
}

export class RenderedHook<T> extends RenderedProgramNode<HookValue> {
  static create<T>(universe: Root, hook: Reactive<Hook<T>>): RenderedHook<T> {
    return new RenderedHook(universe, hook);
  }

  readonly #hook: Reactive<Hook<T>>;
  readonly #universe: Root;

  private constructor(universe: Root, hook: Reactive<Hook<T>>) {
    super();
    this.#universe = universe;
    this.#hook = hook;
  }

  get metadata(): ReactiveMetadata {
    return this.#hook.metadata;
  }

  initialize(_inside: object): void {
    // TODO: Revisit later once we have streaming with sidecar
  }

  poll(inside: HookValue): void {
    LOGGER.trace.group("\npolling RenderedHook", () => {
      let hook = this.#hook.current;
      LOGGER.trace.log(`=> polled`, hook.description);

      LIFETIME.link(this, hook);

      LOGGER.trace.group(
        `hook.current (getting value of instance of ${hook.description})`,
        () => {
          HookValue.update(inside, hook.current);
        }
      );
    });
  }
}
