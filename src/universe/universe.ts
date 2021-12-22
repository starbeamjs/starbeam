import type { SimpleDocument } from "@simple-dom/interface";
import { createDocument } from "simple-dom";
import {
  DomImplementation,
  SimpleDomImplementation,
  SimpleDomTypes,
} from "../dom/implementation";
import { UpdatingContentCursor, ReactiveDOM } from "../dom";
import type {
  AnyRendered,
  AbstractProgramNode,
  Rendered,
  ProgramNode,
} from "../output/program-node";
import { Cell } from "../reactive/cell";
import type { AnyReactiveChoice } from "../reactive/choice";
import type { Reactive } from "../reactive/core";
import { Memo } from "../reactive/functions/memo";
import { Matcher, ReactiveMatch } from "../reactive/match";
import { InnerDict, ReactiveRecord } from "../reactive/record";
import { Static } from "../reactive/static";
import { Profile } from "./profile";
import { Timeline } from "./timeline";
import type { AnyNode, DomTypes } from "../dom/types";
import type { minimal } from "../../tests/support/starbeam";
import type {
  CompatibleDocument,
  CompatibleElement,
} from "../dom/streaming/compatible-dom";

export const TIMELINE = Symbol("TIMELINE");

export class Universe<T extends DomTypes = DomTypes> {
  /**
   * Create a new timeline in order to manage outputs using SimpleDOM. It's safe
   * to use SimpleDOM with the real DOM as long as you don't need runtime
   * features like event handlers and dynamic properties.
   */
  static document(
    document: CompatibleDocument,
    profile = Profile.Debug
  ): Universe<SimpleDomTypes> {
    return new Universe(document as minimal.Document, profile);
  }

  readonly #document: minimal.Document;
  readonly #profile: Profile;
  readonly #timeline = Timeline.create();

  readonly dom: ReactiveDOM<T> = new ReactiveDOM();

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

  renderIntoElement<N extends minimal.ChildNode>(
    node: ProgramNode<N>,
    parentNode: CompatibleElement
  ): Rendered {
    return node.render(
      UpdatingContentCursor.appending(parentNode, this.#domImplementation)
    );
  }

  render<N extends AnyNode<T>>(
    output: AbstractProgramNode<T, N>,
    cursor: UpdatingContentCursor<T>
  ): Rendered<T, N> {
    return output.render(this.#domImplementation, cursor);
  }

  poll(rendered: AnyRendered<T>) {
    rendered.poll(this.#domImplementation);
  }
}
