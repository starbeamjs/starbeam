import { Profile, Timestamp } from ".";
import {
  DomImplementation,
  DomTypes,
  SimpleDomImplementation,
  SimpleDomTypes,
} from "../dom/implementation";
import { ChildNodeCursor, DOM } from "../dom/index";
import { Output, Rendered } from "../output/output";
import { Cell } from "../reactive/cell";
import { Reactive } from "../reactive/core";
import { SimpleDocument } from "@simple-dom/interface";
import { Static } from "../reactive/static";
import { createDocument } from "simple-dom";
import { InnerDict, ReactiveRecord } from "../reactive/record";

export const NOW = Symbol("NOW");
export const BUMP = Symbol("BUMP");
export const CONSUME = Symbol("CONSUME");

export interface ReactivityTimeline {
  // Returns the current timestamp
  [NOW](): Timestamp;
  // Increment the current timestamp and return the incremented timestamp.
  [BUMP](): Timestamp;
  // TODO
  [CONSUME](_reactive: Reactive<unknown>): void;
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

  [CONSUME](_reactive: Reactive<unknown>) {}

  reactive<T>(value: T): Cell<T> {
    return new Cell(value, this);
  }

  static<T>(value: T): Static<T> {
    return new Static(value);
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
