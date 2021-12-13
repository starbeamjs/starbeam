import { Profile, Timestamp } from ".";
import {
  DomImplementation,
  DomTypes,
  SimpleDomImplementation,
  SimpleDomTypes,
} from "../dom/implementation";
import { ChildNodeCursor, DOM } from "../dom/index";
import { Output, Rendered } from "../output/output";
import { AnyCell, Cell } from "../reactive/cell";
import { Reactive } from "../reactive/core";
import { SimpleDocument } from "@simple-dom/interface";
import { Static } from "../reactive/static";
import { createDocument } from "simple-dom";
import { InnerDict, ReactiveRecord } from "../reactive/record";
import { AnyChoice } from "../reactive/choice";
import { Matcher, ReactiveMatch } from "../reactive/match";
import { Memo } from "../reactive/functions/memo";
import { ActiveFrame, FinalizedFrame } from "./frames";
import { assert } from "../utils";

export const NOW = Symbol("NOW");
export const BUMP = Symbol("BUMP");
export const CONSUME = Symbol("CONSUME");
export const WITH_FRAME = Symbol("WITH_FRAME");

export interface ReactivityTimeline {
  // Returns the current timestamp
  [NOW](): Timestamp;
  // Increment the current timestamp and return the incremented timestamp.
  [BUMP](): Timestamp;
  // Indicate that a particular cell was used inside of the current computation.
  [CONSUME](cell: AnyCell): void;
  // Run a computation in the context of a frame, and return a finalized frame.
  [WITH_FRAME]<T>(callback: () => T): { frame: FinalizedFrame<T>; initial: T };
}

export class Timeline<T extends DomTypes = DomTypes>
  implements ReactivityTimeline
{
  /**
   * Create a new timeline in order to manage outputs using SimpleDOM. It's safe
   * to use SimpleDOM with the real DOM as long as you don't need runtime
   * features like event handlers and dynamic properties.
   */
  static simpleDOM(
    ...[implementation = createDocument(), profile = Profile.Debug]:
      | [SimpleDocument?, Profile?]
      | [SimpleDomImplementation]
  ): Timeline<SimpleDomTypes> {
    if (implementation instanceof SimpleDomImplementation) {
      return new Timeline(implementation);
    } else {
      return new Timeline(new SimpleDomImplementation(implementation, profile));
    }
  }

  #now = new Timestamp(1);
  #frame: ActiveFrame | null = null;
  readonly #domImplementation: DomImplementation<T>;

  readonly dom: DOM<T> = new DOM();

  constructor(document: DomImplementation<T>) {
    this.#domImplementation = document;
  }

  [NOW](): Timestamp {
    return this.#now;
  }

  [BUMP](): Timestamp {
    this.#now = this.#now.next();
    return this.#now;
  }

  [CONSUME](cell: AnyCell) {
    if (this.#frame) {
      this.#frame.add(cell);
    }
  }

  [WITH_FRAME]<T>(callback: () => T): { frame: FinalizedFrame<T>; initial: T } {
    this.#frame = new ActiveFrame();
    let result = callback();
    let frame = this.#frame.finalize(result, this.#now);
    this.#frame = null;
    return frame;
  }

  cell<T>(value: T): Cell<T> {
    return new Cell(value, this);
  }

  /*
   * Create a memoized value that re-executes whenever any cells used in its
   * computation invalidate.
   */
  memo<T>(callback: () => T): Memo<T> {
    return Memo.create(callback, this);
  }

  static<T>(value: T): Static<T> {
    return new Static(value);
  }

  match<C extends AnyChoice>(
    reactive: Reactive<C>,
    matcher: C extends infer ActualC
      ? ActualC extends AnyChoice
        ? Matcher<ActualC>
        : never
      : never
  ): ReactiveMatch<C, typeof matcher> {
    return ReactiveMatch.match(reactive, matcher);
  }

  record<T extends InnerDict>(dict: T): ReactiveRecord<T> {
    return new ReactiveRecord(dict);
  }

  renderIntoElement<N extends T[keyof T]>(
    output: Output<T, N>,
    parentNode: T["element"]
  ): Rendered<T, N> {
    return output.render(
      this.#domImplementation,
      ChildNodeCursor.appending(parentNode, this.#domImplementation)
    );
  }

  render<N extends T[keyof T]>(
    output: Output<T, N>,
    cursor: ChildNodeCursor<T>
  ): Rendered<T, N> {
    return output.render(this.#domImplementation, cursor);
  }

  poll<N extends T[keyof T]>(rendered: Rendered<T, N>) {
    rendered.poll(this.#domImplementation);
  }
}
