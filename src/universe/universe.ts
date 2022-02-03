import type { anydom, minimal } from "@domtree/flavors";
import { CELLS, scopedCached, scopedReactive } from "../decorator/reactive";
import { ReactiveDOM } from "../dom";
import type { DomEnvironment } from "../dom/environment";
import { DOM, MINIMAL } from "../dom/streaming/compatible-dom";
import { TreeConstructor } from "../dom/streaming/tree-constructor";
import { HookBlueprint, HookConstructor } from "../hooks/simple";
import { HookCursor, HookProgramNode, HookValue } from "../program-node/hook";
import type {
  ContentProgramNode,
  ProgramNode,
} from "../program-node/interfaces/program-node";
import { Cell } from "../reactive/cell";
import type { AnyReactiveChoice } from "../reactive/choice";
import type { AbstractReactive, Reactive } from "../reactive/core";
import { Memo } from "../reactive/functions/memo";
import { Matcher, ReactiveMatch } from "../reactive/match";
import { InnerDict, ReactiveRecord } from "../reactive/record";
import { Static } from "../reactive/static";
import { Abstraction } from "../strippable/abstraction";
import { verified } from "../strippable/assert";
import { is, minimize } from "../strippable/minimal";
import { expected } from "../strippable/verify-context";
import {
  Finalizer,
  IntoFinalizer,
  Lifetime,
  UniverseLifetime,
} from "./lifetime/lifetime";
import { Profile } from "./profile";
import { RenderedRoot } from "./root";
import { Timeline } from "./timeline";

export const TIMELINE = Symbol("TIMELINE");

export class Universe {
  /**
   * Create a new timeline in order to manage outputs using SimpleDOM. It's safe
   * to use SimpleDOM with the real DOM as long as you don't need runtime
   * features like event handlers and dynamic properties.
   */
  static environment(
    environment: DomEnvironment,
    profile = Profile.Debug
  ): Universe {
    return new Universe(
      environment,
      Timeline.create(),
      Lifetime.scoped(),
      profile
    );
  }

  /** @internal */
  finalize(object: object): void {
    Lifetime.finalize(this.#lifetime, this, object);
  }

  /** @internal */
  withAssertFrame(callback: () => void, description: string): void {
    this.#timeline.withAssertFrame(callback, description);
  }

  readonly #environment: DomEnvironment;
  readonly #profile: Profile;
  readonly #timeline: Timeline;
  readonly #lifetime: Lifetime;

  readonly dom: ReactiveDOM = new ReactiveDOM();
  readonly on = {
    destroy: (object: object, finalizer: IntoFinalizer) =>
      this.#lifetime.register(object, Finalizer.from(finalizer)),
  } as const;

  get lifetime(): UniverseLifetime {
    return this.#lifetime;
  }

  readonly reactive: PropertyDecorator;
  readonly cached: PropertyDecorator;

  private constructor(
    document: DomEnvironment,
    timeline: Timeline,
    disposal: Lifetime,
    profile: Profile
  ) {
    this.#environment = document;
    this.#timeline = timeline;
    this.#lifetime = disposal;
    this.#profile = profile;

    this.reactive = scopedReactive(timeline);
    this.cached = scopedCached(timeline);
  }

  hook<T>(callback: HookConstructor<T>, description: string): HookBlueprint<T> {
    return HookBlueprint.create(this, callback, description);
  }

  use<T>(
    hook: HookBlueprint<T>,
    { into }: { into: HookValue<T> }
  ): RenderedRoot<HookValue> {
    let node = HookProgramNode.create(this, hook);
    return this.build(node, {
      cursor: HookCursor.create(),
      hydrate: () => into,
    });
  }

  get<T extends object, K extends keyof T>(
    object: T,
    key: K
  ): AbstractReactive<T[K]> {
    let cell = CELLS.get(object, key);

    if (cell) {
      return cell as AbstractReactive<T[K]>;
    }

    let descriptor = verified(
      getReactiveDescriptor(object, key),
      is.Present,
      expected(`the key passed to universe.get`)
        .toBe(`a property of the object`)
        .butGot(() => String(key))
    );

    if (descriptor.value) {
      return this.static(descriptor.value);
    } else {
      return this.memo(() => object[key], `getting ${String(key)}`);
    }
  }

  cell<T>(value: T, description = "anonymous"): Cell<T> {
    return Cell.create(value, this.#timeline, description);
  }

  /*
   * Create a memoized value that re-executes whenever any cells used in its
   * computation invalidate.
   */
  memo<T>(
    callback: () => T,
    description = `memo ${Abstraction.callerFrame().trimStart()}`
  ): Memo<T> {
    return Memo.create(callback, this.#timeline, description);
  }

  static<T>(value: T): Static<T> {
    return new Static(value);
  }

  match<C extends AnyReactiveChoice>(
    reactive: Reactive<C>,
    matcher: C extends infer ActualC
      ? ActualC extends AnyReactiveChoice
        ? Matcher<ActualC>
        : never
      : never,
    description = `match ${reactive.description}`
  ): ReactiveMatch<C, typeof matcher> {
    return ReactiveMatch.match(reactive, matcher, description);
  }

  record<T extends InnerDict>(dict: T): ReactiveRecord<T> {
    return new ReactiveRecord(dict);
  }

  build<Cursor, Container>(
    node: ProgramNode<Cursor, Container>,
    {
      cursor,
      hydrate,
    }: { cursor: Cursor; hydrate: (cursor: Cursor) => Container }
  ): RenderedRoot<Container> {
    let rendered = node.render(cursor);

    let container = hydrate(cursor);

    let root = RenderedRoot.create({
      rendered,
      container,
    });

    this.#lifetime.root(root);
    this.lifetime.link(root, rendered);

    return root;
  }

  render(
    node: ContentProgramNode,
    { append }: { append: anydom.ParentNode }
  ): RenderedRoot<minimal.ParentNode> {
    return this.build(node, {
      cursor: TreeConstructor.html(this.#environment),
      hydrate: (buffer: TreeConstructor) => {
        buffer.replace(this.#appending(append));
        return minimize(append);
      },
    });
  }

  #appending(parent: anydom.ParentNode): minimal.TemplateElement {
    let placeholder = MINIMAL.element(
      this.#environment.document,
      parent as minimal.ParentNode,
      "template"
    );

    DOM.insert(placeholder, DOM.appending(parent));
    return placeholder;
  }
}

/**
 * The descriptor may be on the object itself, or it may be on the prototype (as a getter).
 */
function getReactiveDescriptor(
  object: object,
  key: PropertyKey
): PropertyDescriptor | null {
  let target = object;

  while (target) {
    let descriptor = Object.getOwnPropertyDescriptor(target, key);

    if (descriptor) {
      return descriptor;
    }

    target = Object.getPrototypeOf(target);
  }

  return null;
}
