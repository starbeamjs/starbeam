import type { AnyRecord } from "@starbeam/fundamental";
import { Styled, StyledFragment } from "./fragment.js";

export type IntoStyle = Style | AnyRecord;

export class Style {
  static from(style: IntoStyle) {
    if (style instanceof Style) {
      return style;
    } else {
      return new Style(style);
    }
  }

  readonly #rules: AnyRecord;

  private constructor(rules: AnyRecord) {
    this.#rules = rules;
  }

  css(): string {
    return Object.entries(this.#rules)
      .map(([key, value]) => `${key}: ${value}`)
      .join("; ");
  }
}

export type IntoStyles = Record<string, IntoStyle>;
export type RulesFor<S extends IntoStyles> = { [P in keyof S]: Style };

function RulesFor<S extends IntoStyles>(from: IntoStyles): RulesFor<S> {
  return Object.fromEntries(
    Object.entries(from).map(([name, style]) => [name, Style.from(style)])
  ) as RulesFor<S>;
}

export type BuildSheet<S extends Record<string, Style>> = {
  [P in keyof S]: (text: string) => Styled;
};

export class Stylesheet<S extends Record<string, Style>> {
  static create<S extends IntoStyles>(styles: S): Stylesheet<RulesFor<S>> {
    return new Stylesheet(RulesFor(styles));
  }

  readonly #styles: S;

  constructor(styles: S) {
    this.#styles = styles;
  }

  add<S2 extends IntoStyles>(styles: S2): Stylesheet<S & RulesFor<S2>> {
    return new Stylesheet({
      ...this.#styles,
      ...(RulesFor(styles) as RulesFor<S2>),
    });
  }

  get<K extends keyof S>(name: K): string {
    return this.#styles[name].css();
  }

  build(): BuildSheet<S> {
    const styles = Object.fromEntries(
      Object.entries(this.#styles).map(([name, style]) => [
        name,
        this.#styles[name].css(),
      ])
    );

    return Object.fromEntries(
      Object.entries(styles).map(([name, style]) => [
        name,
        (text: string): Styled => StyledFragment.create(text, style),
      ])
    ) as BuildSheet<S>;
  }

  style<K extends keyof S>(name: K, text: string): Styled {
    return StyledFragment.create(text, this.#styles[name].css());
  }
}
