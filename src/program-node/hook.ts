import type { Hook } from "../hooks/hook";
import { HookBlueprint, SimpleHook } from "../hooks/simple";
import type { Reactive } from "../reactive/core";
import type { ReactiveMetadata } from "../reactive/metadata";
import { assert } from "../strippable/core";
import { LOGGER } from "../strippable/trace";
import type { AnyKey } from "../strippable/wrapper";
import type { Universe } from "../universe";
import {
  AbstractProgramNode,
  RenderedProgramNode,
} from "./interfaces/program-node";

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
  static create<T>(
    universe: Universe,
    hook: HookBlueprint<T>
  ): HookProgramNode<T> {
    return new HookProgramNode(universe, SimpleHook.construct(hook));
  }

  readonly #universe: Universe;
  readonly #hook: Reactive<Hook>;

  private constructor(universe: Universe, hook: Reactive<Hook<T>>) {
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
  static create<T>(
    universe: Universe,
    hook: Reactive<Hook<T>>
  ): RenderedHook<T> {
    return new RenderedHook(universe, hook);
  }

  readonly #hook: Reactive<Hook<T>>;
  readonly #universe: Universe;

  private constructor(universe: Universe, hook: Reactive<Hook<T>>) {
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

      this.#universe.lifetime.link(this, hook);

      LOGGER.trace.group(
        `hook.current (getting value of instance of ${hook.description})`,
        () => {
          HookValue.update(inside, hook.current);
        }
      );
    });
  }
}
