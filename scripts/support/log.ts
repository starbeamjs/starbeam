import ansicolor from "ansicolor";
import chalk, { type ChalkInstance } from "chalk";
import type { LoggerState } from "./reporter/logger.js";
import type { ReporterOptions } from "./reporter/reporter.js";
import {
  getStyle,
  hasPart,
  isAnyStyleName,
  STYLE,
  StylePart,
  STYLES,
  type AnyStyleName,
  type StyleName,
} from "./reporter/styles.js";
import { Result } from "./type-magic.js";

export function log(message: string, style: Style = Style.default): void {
  console.log(Fragment(style, message));
}

log.newline = () => log("");

export type StyleInstance = ChalkInstance;

export type IntoStyleInstance = Style;

export function IntoDetailedStyle(from: IntoStyleInstance): DetailedStyle {
  if (isDetailed(from)) {
    return from;
  } else {
    return {
      [STYLE]: StyleInstance.resolve(from),
    };
  }
}

export function IntoStyleInstance(from: IntoStyleInstance): StyleInstance {
  if (isDetailed(from)) {
    return from[STYLE];
  } else {
    return StyleInstance.resolve(from);
  }
}

export interface Verbosity {
  verbose: boolean;
  stylish: boolean;
}

export type IntoLeafFragment = string | LeafFragment;
export type IntoFragment = Fragment | string | IntoFragment[];

export function isIntoFragment(value: unknown): value is IntoFragment {
  return (
    FragmentFn.is(value) ||
    typeof value === "string" ||
    (Array.isArray(value) && value.every(isIntoFragment))
  );
}

export type FallibleFragment = Result<FragmentImpl, FragmentImpl>;
export type IntoFallibleFragment = IntoFragment | LogResult<IntoFragment>;

export type LogResult<T> = Result<T, IntoFragment>;
export type IntoLogResult<T> = T | LogResult<T>;

export const LogResult = {
  ok: <T>(value: T): LogResult<T> => Result.ok(value),
  err: <T>(value: IntoFragment): LogResult<T> => Result.err(value),
};

export abstract class FragmentImpl {
  static fallibleFrom(from: IntoFallibleFragment): FallibleFragment {
    return Result.from(from)
      .map((f) => FragmentImpl.from(f))
      .mapErr((f) => FragmentImpl.from(f));
  }

  static from(from: IntoFragment): FragmentImpl {
    if (Array.isArray(from)) {
      if (from.length === 1) {
        return FragmentImpl.from(from[0]);
      } else {
        return new FragmentGroup(from.map(FragmentImpl.from));
      }
    } else if (typeof from === "string") {
      return LeafFragment.from(from);
    } else {
      return from;
    }
  }

  static stringify(from: IntoFragment, options: LoggerState): string {
    if (typeof from === "string") {
      return from;
    } else {
      return Fragment.from(from).stringify(options);
    }
  }

  static isEmpty(fragment: IntoFragment, options: LoggerState): boolean {
    const string = FragmentImpl.stringify(fragment, options);

    return /^\s*$/.test(ansicolor.strip(string));
  }

  update(updater: (prev: StyleInstance) => IntoStyleInstance): Fragment {
    return this.updateStyle((prev) => IntoStyleInstance(updater(prev)));
  }

  abstract updateStyle(
    updater: (prev: StyleInstance) => StyleInstance
  ): FragmentImpl;

  concat(other: LogResult<IntoFragment>): FallibleFragment;
  concat(other: IntoFragment): Fragment;
  concat(other: IntoFallibleFragment): FallibleFragment | Fragment {
    if (other && other instanceof Result) {
      return FragmentImpl.fallibleFrom(other).map((f) =>
        this.concatFragment(f)
      );
    } else {
      return this.concatFragment(FragmentImpl.from(other));
    }
  }

  abstract concatFragment(other: FragmentImpl): FragmentImpl;

  abstract width(options: LoggerState): number;
  abstract stringify(options: LoggerState): string;

  abstract toString(): string;
}

class FragmentGroup extends FragmentImpl {
  readonly #fragments: Fragment[];

  constructor(fragments: Fragment[]) {
    super();
    this.#fragments = fragments;
  }

  stringify(options: LoggerState): string {
    return this.#fragments.map((f) => f.stringify(options)).join("");
  }

  toString(): string {
    return this.#fragments.map(String).join("");
  }

  updateStyle(updater: (prev: StyleInstance) => StyleInstance): FragmentImpl {
    return new FragmentGroup(
      this.#fragments.map((f) => f.updateStyle(updater))
    );
  }

  concatFragment(other: FragmentImpl): FragmentImpl {
    return new FragmentGroup([...this.#fragments, other]);
  }

  width(options: LoggerState): number {
    return this.#fragments.reduce((total, f) => total + f.width(options), 0);
  }
}

class LeafFragment extends FragmentImpl {
  static from(from: IntoLeafFragment): LeafFragment {
    if (from instanceof LeafFragment) {
      return from;
    } else {
      return LeafFragment.plain(from);
    }
  }

  static create(style: StyleInstance, message: string): LeafFragment {
    return new LeafFragment(style, message, { verbose: false, stylish: false });
  }

  static plain(message: string): LeafFragment {
    return new LeafFragment(Style.default, message, {
      verbose: false,
      stylish: false,
    });
  }

  readonly #style: StyleInstance;
  readonly #message: string;
  readonly #verbosity: Verbosity;

  constructor(style: StyleInstance, message: string, verbosity: Verbosity) {
    super();

    if (typeof style !== "function") {
      throw new Error("Style must be a function");
    }

    this.#style = style;
    this.#message = message;
    this.#verbosity = verbosity;
  }

  updateStyle(updater: (prev: StyleInstance) => StyleInstance): LeafFragment {
    return new LeafFragment(
      updater(this.#style),
      this.#message,
      this.#verbosity
    );
  }

  verbose(): LeafFragment {
    return new LeafFragment(this.#style, this.#message, {
      ...this.#verbosity,
      verbose: true,
    });
  }

  stylish(): LeafFragment {
    return new LeafFragment(this.#style, this.#message, {
      ...this.#verbosity,
      stylish: true,
    });
  }

  stringify(): string {
    return this.#style(this.#message) ?? "";
  }

  width(): number {
    return this.#message.length;
  }

  get style(): StyleInstance {
    return this.#style;
  }

  get message(): string {
    return this.#message;
  }

  concatFragment(other: FragmentImpl): FragmentImpl {
    return new FragmentGroup([this, other]);
  }

  toString(): string {
    return this.#style(this.#message);
  }
}

export class DensityChoosingFragment extends FragmentImpl {
  readonly #choices: DensityChoices;
  readonly #defaultChoice: DensityChoice;
  readonly #updates: ((prev: StyleInstance) => StyleInstance)[];

  constructor(
    choices: DensityChoices,
    defaultChoice: DensityChoice = "comfortable",
    updates: ((prev: StyleInstance) => StyleInstance)[] = []
  ) {
    super();
    this.#choices = choices;
    this.#defaultChoice = defaultChoice;
    this.#updates = updates;
  }

  #stringify({
    options,
    selection = this.#defaultChoice,
  }: {
    options: LoggerState | undefined;
    selection?: DensityChoice;
  }): string {
    let fragment = this.#choices[selection];

    for (const update of this.#updates) {
      fragment = fragment.updateStyle(update);
    }

    if (options) {
      return fragment.stringify(options);
    } else {
      return String(fragment);
    }
  }

  stringify(options: LoggerState): string {
    return this.#stringify({ options, selection: options.density });
  }

  toString(): string {
    return this.#stringify({
      options: undefined,
      selection: this.#defaultChoice,
    });
  }

  updateStyle(updater: (prev: StyleInstance) => StyleInstance): FragmentImpl {
    return new DensityChoosingFragment(this.#choices, this.#defaultChoice, [
      ...this.#updates,
      updater,
    ]);
  }

  concatFragment(other: FragmentImpl): FragmentImpl {
    const choices = Object.fromEntries(
      Object.entries(this.#choices).map(([density, fragment]) => [
        density,
        fragment.concatFragment(other),
      ])
    ) as DensityChoices;

    return new DensityChoosingFragment(choices);
  }

  width(options: LoggerState): number {
    return this.#choices[options.density].width(options);
  }
}

export interface DetailedStyle {
  readonly [STYLE]: StyleInstance;
  readonly header?: StyleInstance;
  readonly decoration?: StyleInstance;
  [key: string]: StyleInstance | undefined;
}

export type Style = StyleInstance | DetailedStyle | AnyStyleName;

export type Printable = string | number | boolean;

export function FragmentFn(style: Style, message: Printable): FragmentImpl {
  const resolved = StyleInstance.resolve(style);
  return LeafFragment.create(resolved, String(message));
}

FragmentFn.fallibleFrom = FragmentImpl.fallibleFrom;
FragmentFn.from = FragmentImpl.from;
FragmentFn.stringify = FragmentImpl.stringify;
FragmentFn.isEmpty = FragmentImpl.isEmpty;

FragmentFn.inverse = (message: Printable): FragmentImpl =>
  FragmentFn(chalk.inverse, message);

FragmentFn.is = (value: unknown): value is FragmentImpl => {
  return !!(value && value instanceof FragmentImpl);
};

FragmentFn.decoration = (style: Style, message: Printable): Fragment => {
  return FragmentFn(Style.decoration(style), message);
};

FragmentFn.header = (style: Style, message: Printable): Fragment => {
  return FragmentFn(Style.header(style), message);
};

FragmentFn.inverted = (style: Style, message: string): Fragment => {
  return FragmentFn(Style.inverse(style), message);
};

type ToFragmentFn = ((message: Printable) => Fragment) & {
  inverse: (message: Printable) => Fragment;
};
type ParentToFragmentFn = typeof FragmentFn & {
  [P in StyleName]: ToFragmentFn & {
    [P in StylePart]: ToFragmentFn;
  };
};

for (const [name, style] of Object.entries(STYLES) as [StyleName, Style][]) {
  const Frag = FragmentFn as unknown as Record<string, ToFragmentFn>;

  const Fn = (message: Printable) => FragmentFn(style, message);
  Fn.inverse = (message: Printable) =>
    FragmentFn(Style.inverse(style), message);

  Frag[name] = Fn;

  for (const part of StylePart.members) {
    const SubFrag = Frag[name] as unknown as Record<string, ToFragmentFn>;
    const Fn = (message: Printable) => FragmentFn(`${name}:${part}`, message);
    Fn.inverse = (message: Printable) => FragmentFn(`${name}:${part}`, message);

    SubFrag[part] = Fn;
  }
}

export type Fragment = FragmentImpl;
export const Fragment = FragmentFn as typeof FragmentFn & ParentToFragmentFn;

export const Style = {
  is: (value: unknown): value is Style => {
    if (typeof value === "string") {
      return isAnyStyleName(value);
    } else if (typeof value === "function") {
      return true;
    } else {
      return false;
    }
  },

  reset: (message: string): string => chalk.reset(message),
  default: chalk,

  inverse: (style: Style): StyleInstance => {
    const resolved = StyleInstance.resolve(style);
    return resolved.inverse;
  },

  specific: (style: Style, part: StylePart): StyleInstance => {
    const resolved = IntoDetailedStyle(style);

    if (hasPart(resolved, part)) {
      return resolved[part][STYLE];
    } else {
      return resolved[STYLE];
    }
  },

  decoration: (style: Style): StyleInstance => {
    return Style.specific(style, "decoration");
  },

  header: (style: Style): StyleInstance => {
    return Style.specific(style, "header");
  },
};

export function isDetailed(value: unknown): value is DetailedStyle {
  return !!(value && STYLE in value);
}

export const StyleInstance = {
  resolve: (style: Style): StyleInstance => {
    if (typeof style === "string") {
      return getStyle(style);
    } else if (isDetailed(style)) {
      return style[STYLE];
    } else {
      return style;
    }
  },
};

export type DensityChoice = ReporterOptions["density"];

export type DensityChoices = {
  [P in DensityChoice]: Fragment;
};
