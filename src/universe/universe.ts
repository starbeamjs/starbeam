import type { anydom, minimal } from "@domtree/flavors";
import { ReactiveDOM } from "../dom";
import { COMPATIBLE_DOM, MINIMAL_DOM } from "../dom/streaming/compatible-dom";
import { TreeConstructor } from "../dom/streaming/tree-constructor";
import type {
  ContentProgramNode,
  RenderedProgramNode,
} from "../program-node/interfaces/program-node";
import type { RenderedContent } from "../program-node/interfaces/rendered-content";
import { Cell } from "../reactive/cell";
import type { AnyReactiveChoice } from "../reactive/choice";
import type { Reactive } from "../reactive/core";
import { Memo } from "../reactive/functions/memo";
import { Matcher, ReactiveMatch } from "../reactive/match";
import { InnerDict, ReactiveRecord } from "../reactive/record";
import { Static } from "../reactive/static";
import { Profile } from "./profile";
import { Timeline } from "./timeline";

export const TIMELINE = Symbol("TIMELINE");

export class Universe {
  /**
   * Create a new timeline in order to manage outputs using SimpleDOM. It's safe
   * to use SimpleDOM with the real DOM as long as you don't need runtime
   * features like event handlers and dynamic properties.
   */
  static document(
    document: anydom.Document,
    profile = Profile.Debug
  ): Universe {
    return new Universe(document as minimal.Document, profile);
  }

  readonly #document: minimal.Document;
  // @ts-expect-error TODO: Logging
  readonly #profile: Profile;
  readonly #timeline = Timeline.create();

  readonly dom: ReactiveDOM = new ReactiveDOM();

  constructor(document: minimal.Document, profile: Profile) {
    this.#document = document;
    this.#profile = profile;
  }

  cell<T>(value: T): Cell<T> {
    return new Cell(value, this.#timeline);
  }

  /*
   * Create a memoized value that re-executes whenever any cells used in its
   * computation invalidate.
   */
  memo<T>(callback: () => T): Memo<T> {
    return Memo.create(callback, this.#timeline);
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
      : never
  ): ReactiveMatch<C, typeof matcher> {
    return ReactiveMatch.match(reactive, matcher);
  }

  record<T extends InnerDict>(dict: T): ReactiveRecord<T> {
    return new ReactiveRecord(dict);
  }

  renderIntoElement<R extends RenderedContent>(
    node: ContentProgramNode<R>,
    parent: anydom.Element
  ): R | null {
    let buffer = TreeConstructor.html();
    let rendered = this.render(node, buffer);

    if (rendered) {
      let placeholder = this.#appending(parent);

      buffer.replace(placeholder);

      return rendered;
    }

    return null;
  }

  render<R extends RenderedContent>(
    node: ContentProgramNode<R>,
    buffer: TreeConstructor
  ): R | null {
    return node.render(buffer);
  }

  poll(rendered: RenderedProgramNode, inside: minimal.Element) {
    rendered.poll(inside);
  }

  #appending(parent: anydom.Element): minimal.TemplateElement {
    let placeholder = MINIMAL_DOM.element(
      this.#document,
      parent as minimal.Element,
      "template"
    );
    COMPATIBLE_DOM.insert(placeholder, COMPATIBLE_DOM.appending(parent));
    return placeholder;
  }
}
