import { capabilities, setModifierManager } from "@ember/modifier";
import type { ElementResourceBlueprint as RendererElementResourceBlueprint } from "@starbeam/renderer";
import { setupElementResource } from "@starbeam/renderer";
import { RUNTIME } from "@starbeam/runtime";

import { TrackedTag } from "./tracked.js";

export type ElementResourceBlueprint<
  E extends Element,
  T,
> = RendererElementResourceBlueprint<E, T>;

export type ElementResourceSink<T> = (value: T | null) => void;

export interface ElementResourceModifierOptions<T> {
  /**
   * Called with the resource's value after every sync, and with `null` when
   * the modifier is torn down.
   */
  readonly into?: ElementResourceSink<T> | undefined;
}

export interface ElementResourceModifierArgs {
  readonly Positional?: readonly unknown[];
  readonly Named?: Record<string, unknown>;
}

export interface ElementResourceModifier<E extends Element> {
  readonly __starbeamElementResource: E;
}

export interface ElementResourceHandle<E extends Element, T> {
  /**
   * Autotracked: reading inside a Glimmer autotracking frame registers the
   * handle as a dependency, and writes from the resource invalidate it.
   *
   * `null` before the modifier is attached and after it is torn down.
   */
  readonly current: T | null;

  /**
   * The Ember modifier that attaches the resource to its element. Apply with
   * the standard `{{modifier-name}}` invocation, or pass it through
   * a `@type-of-modifier` argument.
   */
  readonly modifier: ElementResourceModifier<E>;
}

interface ElementResourceModifierDefinition<E extends Element, T> {
  readonly blueprint: ElementResourceBlueprint<E, T>;
  readonly options: ElementResourceModifierOptions<T>;
  current: object | undefined;
}

interface ElementResourceModifierState<E extends Element, T> {
  readonly definition: ElementResourceModifierDefinition<E, T>;
  resourceElement?: Element | undefined;
  resource?: ReturnType<typeof setupElementResource<E, T>> | undefined;
  unsubscribe?: (() => void) | undefined;
  current: object | undefined;
}

interface ModifierArguments {
  readonly positional: readonly unknown[];
  readonly named: Record<string, unknown>;
}

class StarbeamElementResourceModifierManager {
  readonly capabilities = capabilities("3.22");

  createModifier(
    definition: ElementResourceModifierDefinition<Element, unknown>,
    _args: ModifierArguments,
  ): ElementResourceModifierState<Element, unknown> {
    return {
      definition,
      current: undefined,
    };
  }

  installModifier(
    state: ElementResourceModifierState<Element, unknown>,
    element: Element,
    args: ModifierArguments,
  ): void {
    this.#consume(args);
    this.#setup(state, element);
  }

  updateModifier(
    state: ElementResourceModifierState<Element, unknown>,
    args: ModifierArguments,
  ): void {
    this.#consume(args);
    this.#teardown(state);
    if (state.resourceElement) this.#setup(state, state.resourceElement);
  }

  destroyModifier(state: ElementResourceModifierState<Element, unknown>): void {
    this.#teardown(state, { clear: true });
  }

  #setup(
    state: ElementResourceModifierState<Element, unknown>,
    element: Element,
  ): void {
    const token = {};
    state.current = token;
    state.definition.current = token;
    state.resourceElement = element;
    let active = true;
    let scheduled = false;

    const publish = (value: unknown): void => {
      if (state.definition.current === token) {
        state.definition.options.into?.(value);
      }
    };

    const isCurrent = (): boolean => active && state.current === token;

    const resource = setupElementResource(state.definition.blueprint, element);
    state.resource = resource;

    resource.sync();
    publish(resource.value);

    const flush = (): void => {
      if (!isCurrent()) return;
      resource.sync();
      publish(resource.value);
    };

    const schedule = (): void => {
      if (scheduled || !isCurrent()) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        flush();
      });
    };

    const unsubscribe = RUNTIME.subscribe(resource.sync, schedule);
    state.unsubscribe = (): void => {
      active = false;
      unsubscribe?.();
    };
  }

  #teardown(
    state: ElementResourceModifierState<Element, unknown>,
    options: { clear?: boolean } = {},
  ): void {
    state.unsubscribe?.();
    state.unsubscribe = undefined;
    state.resource?.finalize();
    state.resource = undefined;

    if (options.clear) {
      if (state.definition.current === state.current) {
        state.definition.current = undefined;
        state.definition.options.into?.(null);
      }

      state.current = undefined;
    }
  }

  #consume(args: ModifierArguments): void {
    args.positional.forEach((value) => void value);
    Object.values(args.named).forEach((value) => void value);
  }
}

const ELEMENT_RESOURCE_MODIFIER_MANAGER =
  new StarbeamElementResourceModifierManager();

function elementResourceModifierDefinition<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
  options: ElementResourceModifierOptions<T>,
): ElementResourceModifier<E> {
  return setModifierManager(() => ELEMENT_RESOURCE_MODIFIER_MANAGER, {
    blueprint,
    options,
    current: undefined,
  } as ElementResourceModifierDefinition<
    E,
    T
  >) as unknown as ElementResourceModifier<E>;
}

/**
 * Wrap an element-backed Starbeam resource as an Ember modifier.
 *
 * The blueprint receives the modified element and returns a resource. The
 * resource is created on `install`, synced once, and finalized on teardown.
 * Sync invalidations are coalesced into microtasks.
 *
 * Pass `options.into` to publish the resource value into caller-owned storage
 * (a tracked field, an `ElementResourceHandle`, etc.).
 */
export function elementResourceModifier<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
  options: ElementResourceModifierOptions<T> = {},
): ElementResourceModifier<E> {
  return elementResourceModifierDefinition(blueprint, options);
}

/**
 * Convenience handle for element-backed resources: pairs a tracked `current`
 * value with a modifier that publishes into it.
 *
 * Read `handle.current` inside any autotracking frame (template, getter, etc.).
 * Apply `handle.modifier` to the element that backs the resource.
 */
export function elementResource<E extends Element, T>(
  blueprint: ElementResourceBlueprint<E, T>,
): ElementResourceHandle<E, T> {
  const tag = new TrackedTag();
  let value: T | null = null;

  const publish: ElementResourceSink<T> = (next) => {
    value = next;
    tag.dirty();
  };

  return {
    get current(): T | null {
      tag.consume();
      return value;
    },
    modifier: elementResourceModifier(blueprint, { into: publish }),
  };
}
