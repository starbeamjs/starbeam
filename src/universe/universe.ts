import type { SimpleDocument } from "@simple-dom/interface";
import { createDocument } from "simple-dom";
import {
  DomImplementation,
  SimpleDomImplementation,
  SimpleDomTypes,
} from "../dom/implementation";
import { ChildNodeCursor, ReactiveDOM } from "../dom";
import type { Output, Rendered } from "../output/output";
import { Cell } from "../reactive/cell";
import type { AnyReactiveChoice } from "../reactive/choice";
import type { Reactive } from "../reactive/core";
import { Memo } from "../reactive/functions/memo";
import { Matcher, ReactiveMatch } from "../reactive/match";
import { InnerDict, ReactiveRecord } from "../reactive/record";
import { Static } from "../reactive/static";
import { Profile } from "./profile";
import { Timeline } from "./timeline";
import type { DomTypes } from "../dom/types";

export const TIMELINE = Symbol("TIMELINE");

export class Universe<T extends DomTypes = DomTypes> {
  /**
   * Create a new timeline in order to manage outputs using SimpleDOM. It's safe
   * to use SimpleDOM with the real DOM as long as you don't need runtime
   * features like event handlers and dynamic properties.
   */
  static simpleDOM(
    ...[implementation = createDocument(), profile = Profile.Debug]:
      | [SimpleDocument?, Profile?]
      | [SimpleDomImplementation]
  ): Universe<SimpleDomTypes> {
    if (implementation instanceof SimpleDomImplementation) {
      return new Universe(implementation);
    } else {
      return new Universe(new SimpleDomImplementation(implementation, profile));
    }
  }

  readonly #domImplementation: DomImplementation<T>;
  readonly #timeline = Timeline.create();

  readonly dom: ReactiveDOM<T> = new ReactiveDOM();

  constructor(document: DomImplementation<T>) {
    this.#domImplementation = document;
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

  renderIntoElement(output: Output<T>, parentNode: T["element"]): Rendered<T> {
    return output.render(
      this.#domImplementation,
      ChildNodeCursor.appending(parentNode, this.#domImplementation)
    );
  }

  render(output: Output<T>, cursor: ChildNodeCursor<T>): Rendered<T> {
    return output.render(this.#domImplementation, cursor);
  }

  poll(rendered: Rendered<T>) {
    rendered.poll(this.#domImplementation);
  }
}
