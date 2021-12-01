import { Profile, Timestamp } from ".";
import {
  DomImplementation,
  DomTypes,
  SimpleDomImplementation,
  SimpleDomTypes,
} from "../dom/implementation";
import { DOM } from "../dom/index";
import { Output, Rendered } from "../output/output";
import { Cell } from "../reactive/cell";
import { Reactive } from "../reactive/interface";
import { SimpleDocument } from "@simple-dom/interface";
import { Static } from "../reactive/static";
import { createDocument } from "simple-dom";

export const NOW = Symbol("NOW");
export const BUMP = Symbol("BUMP");
export const CONSUME = Symbol("CONSUME");

export class Timeline<T extends DomTypes = DomTypes> {
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
  readonly #document: DomImplementation<T>;

  readonly dom: DOM<T> = new DOM();

  constructor(document: DomImplementation<T>) {
    this.#document = document;
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

  render<N extends T[keyof T]>(output: Output<T, N>): Rendered<T, N> {
    return output.render(this.#document);
  }

  poll<N extends T[keyof T]>(rendered: Rendered<T, N>) {
    rendered.poll(this.#document);
  }
}
