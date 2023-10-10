import {
  Display,
  DisplayNewtype,
  getFirst,
  getLast,
  isArray,
  isSingleItemArray,
  StyleName,
} from "@starbeam/core-utils";
import type { command } from "@starbeam-dev/schemas";
import type { Command as CommanderCommand } from "commander";

import { type LongFlagString, type ShortFlagString } from "./shared.js";

export interface CommandParameter {
  applyTo: (command: CommanderCommand) => CommanderCommand;
}

export class BooleanFlag implements CommandParameter {
  static of = (spec: command.FlagSpec, format: FormatDescFn): BooleanFlag => {
    return new BooleanFlag(spec, format);
  };

  readonly #name: BooleanFlagName;
  readonly #desc: Desc;

  private constructor(spec: command.FlagSpec, format: FormatDescFn) {
    const [long, desc] = spec;
    this.#name = BooleanFlagName.of(long);
    this.#desc = Desc.of(desc, format);
  }

  get flag(): string {
    return this.#name.long;
  }

  applyTo(command: CommanderCommand): CommanderCommand {
    return command.option(
      this.#name.asCommanderOptionFlags(this.#desc.short),
      this.#desc.description,
    );
  }
}

export class ValuedOption implements CommandParameter {
  static of = (
    spec: command.ValuedOptionSpec,
    format: FormatDescFn,
  ): ValuedOption => {
    return new ValuedOption(spec, format);
  };

  readonly #long: LongFlag;
  readonly #desc: Desc;
  readonly #type: Type<command.OptionValue> | undefined;

  private constructor(spec: command.ValuedOptionSpec, format: FormatDescFn) {
    const [rawLong, rawDesc, rawType] = spec;

    this.#long = LongFlag.of(rawLong);
    this.#desc = Desc.of(rawDesc, format);
    this.#type = rawType ? Type.of(rawType) : undefined;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    const long = this.#long;
    const { description, short } = this.#desc;
    const type = this.#type;

    return Display({
      name: "ValuedOption",
      format: ({ stylize, inspect }) => [
        inspect(long),
        ...(short
          ? [
              stylize(", ", StyleName.punctuation),
              stylize(short, StyleName.literal),
            ]
          : []),
        stylize(": ", StyleName.punctuation),
        inspect(type),
      ],
      annotation: description
        ? ({ stylize }) => [stylize(description, StyleName.annotation)]
        : undefined,
    });
  }

  applyTo(command: CommanderCommand): CommanderCommand {
    return command.option(
      this.#long.asCommanderOptionFlags(this.#desc.short),
      this.#desc.description,
      this.#type?.asCommanderDefault(),
    );
  }
}

export class Arg implements CommandParameter {
  static of = (spec: command.ArgSpec, format: FormatDescFn): Arg => {
    return new Arg(spec, format);
  };

  readonly #desc: ArgDesc;
  // eslint-disable-next-line no-unused-private-class-members -- @todo
  readonly #type: Type;

  private constructor(spec: command.ArgSpec, format: FormatDescFn) {
    const [desc, type] = spec;
    this.#desc = ArgDesc.of(desc, format);
    this.#type = Type.of(type);
  }

  applyTo(command: CommanderCommand): CommanderCommand {
    return command.argument(
      this.#desc.asCommanderLabel(),
      this.#desc.description,
    );
  }
}

export class Type<T extends command.OptionValue = command.OptionValue> {
  static of<T extends command.OptionValue>(
    spec: command.DynamicType<T>,
  ): Type<T> {
    return new Type(spec);
  }

  readonly #spec: command.DynamicType<T>;

  private constructor(spec: command.DynamicType<T>) {
    this.#spec = spec;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    const type = this.type;
    const defaultValue = this.asCommanderDefault();

    if (defaultValue === undefined) {
      return Display({
        name: { compact: "Type" },
        format: ({ stylize }) => stylize(type.name, StyleName.type),
      });
    } else {
      return Display({
        name: { compact: "Type" },
        format: ({ stylize }) => stylize(type.name, StyleName.type),
        annotation: ({ stylize, inspect }) => [
          stylize("default=", StyleName.punctuation),
          inspect(defaultValue),
        ],
      });
    }
  }

  get type(): command.SimpleType<T> {
    return Array.isArray(this.#spec) ? getFirst(this.#spec) : this.#spec;
  }

  asCommanderDefault(): T | undefined {
    const defaultValue = this.default;
    return defaultValue.has ? defaultValue.value : undefined;
  }

  get default(): { has: true; value: T } | { has: false } {
    if (
      isArray(this.#spec) &&
      !isSingleItemArray(this.#spec) &&
      getLast(this.#spec) !== undefined
    ) {
      return { has: true, value: getLast(this.#spec).default };
    } else {
      return { has: false };
    }
  }
}

class BooleanFlagName {
  static of(spec: command.FlagSpec[0]): BooleanFlagName {
    return new BooleanFlagName(validateLong(spec.trim()));
  }

  readonly #spec: LongFlagString;

  private constructor(spec: LongFlagString) {
    this.#spec = spec;
  }

  get default(): boolean {
    return this.#spec.startsWith("--no-");
  }

  get long(): LongFlagString {
    return this.#spec;
  }

  asCommanderOptionFlags(short: ShortFlagString | undefined): string {
    return short ? `${short}, ${this.#spec}` : this.#spec;
  }
}

export type FormatDescFn = (desc: string) => string;

class Desc {
  static of(spec: string, format: FormatDescFn): Desc {
    return new Desc(spec, format);
  }

  readonly #unpacked: UnpackedDescSpec;
  readonly #format: FormatDescFn;

  private constructor(spec: string, format: FormatDescFn) {
    this.#unpacked = unpackDescSpec(spec);
    this.#format = format;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    const { short, description } = this.#unpacked;

    if (short) {
      return Display({
        name: "Desc",
        format: ({ stylize }) => stylize(description, StyleName.literal),
        annotation: short
          ? ({ stylize }) => [
              stylize("short", StyleName.label),
              stylize("=", StyleName.punctuation),
              stylize(short, StyleName.literal),
            ]
          : undefined,
      });
    } else {
      return DisplayNewtype("Desc", this.#unpacked.description);
    }
  }

  get description(): string {
    return this.#format(this.#unpacked.description);
  }

  get short(): ShortFlagString | undefined {
    return this.#unpacked.short;
  }
}

class LongFlag {
  static of(spec: command.ValuedOptionSpec[0]): LongFlag {
    return new LongFlag(spec);
  }

  readonly #unpacked: {
    long: LongFlagString;
    label: string;
    required: boolean;
  };

  private constructor(spec: command.ValuedOptionSpec[0]) {
    this.#unpacked = unpackLongFlagSpec(spec);
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    const { long, label, required } = this.#unpacked;

    return Display({
      name: { compact: "LongFlag" },
      format: ({ stylize }) => stylize(long, StyleName.literal),
      annotation: required ? `<${label}>` : `[${label}]`,
    });
  }

  get flag(): string {
    return this.#unpacked.long.trim();
  }

  get label(): string {
    return this.#unpacked.label.trim();
  }

  get required(): boolean {
    return this.#unpacked.required;
  }

  asCommanderOptionFlags(short: ShortFlagString | undefined): string {
    const label = this.required ? `<${this.label}>` : `[${this.label}]`;

    const longFlag = `${this.flag} ${label}`;
    return short ? `${short}, ${longFlag}` : longFlag;
  }
}

function unpackLongFlagSpec(rawLong: command.ValuedOptionSpec[0]): {
  long: LongFlagString;
  label: string;
  required: boolean;
} {
  const long = rawLong.trim();

  const angle = tryExtractDelimited(long, ["<", ">"]);

  if (angle) {
    return {
      long: validateLong(angle.prefix),
      label: angle.contents,
      required: true,
    };
  }

  const square = tryExtractDelimited(long, ["[", "]"]);

  if (square) {
    return {
      long: validateLong(square.prefix),
      label: square.contents,
      required: false,
    };
  }

  // @fixme report error
  throw new Error(
    `BUG: Invalid long flag: ${long} (expected one of '<label>', '[label]')`,
  );
}

function validateLong(rawFlag: string): LongFlagString {
  // a little bit of Postel's Law for non-TypeScript users.
  const flag = rawFlag.trim();

  if (flag.startsWith("--")) {
    return flag as LongFlagString;
  }

  throw new Error(`BUG: Invalid flag: ${flag}`);
}

const NOT_INCLUDED = -1;
const STRING_START = 0;

function tryExtractDelimited(
  source: string,
  [startDelimiter, endDelimiter]: [start: string, end: string],
) {
  const startIndex = source.indexOf(startDelimiter);
  if (startIndex === NOT_INCLUDED) return;

  const endIndex = source.indexOf(endDelimiter, startIndex);
  if (endIndex === NOT_INCLUDED) return;

  return {
    prefix: source.slice(STRING_START, startIndex),
    suffix: source.slice(endIndex + endDelimiter.length),
    contents: source.slice(startIndex + startDelimiter.length, endIndex),
  };
}

class ArgDesc {
  static of(spec: command.ArgDesc, format: FormatDescFn): ArgDesc {
    return new ArgDesc(spec, format);
  }

  readonly #label: string;
  readonly #required: boolean;
  readonly #description: string;
  readonly #format: FormatDescFn;

  private constructor(spec: command.ArgDesc, format: FormatDescFn) {
    const { label, required, description } = unpackArgDesc(spec);

    this.#label = label;
    this.#required = required;
    this.#description = description;
    this.#format = format;
  }

  [Symbol.for("nodejs.util.inspect.custom")](): object {
    return DisplayNewtype("ArgDesc", this.#description, {
      annotation: this.asCommanderLabel(),
    });
  }

  get description(): string {
    return this.#format(this.#description);
  }

  asCommanderLabel(): string {
    return this.#required ? `<${this.#label}>` : `[${this.#label}]`;
  }
}

function unpackArgDesc(desc: string): {
  label: string;
  required: boolean;
  description: string;
} {
  const angle = tryExtractDelimited(desc, ["<", ">"]);
  if (angle) {
    return {
      label: angle.contents,
      required: true,
      description: angle.suffix.trim(),
    };
  }

  const square = tryExtractDelimited(desc, ["[", "]"]);
  if (square) {
    return {
      label: square.contents,
      required: false,
      description: square.suffix.trim(),
    };
  }

  // @fixme report error
  throw new Error(`BUG: Invalid argument description: ${desc}`);
}

type UnpackedDescSpec =
  | { short: `-${string}`; description: string }
  | { short: undefined; description: string };

function unpackDescSpec(descSpec: string): UnpackedDescSpec {
  if (descSpec.startsWith("-") && descSpec.includes(":")) {
    const [short, description] = descSpec.split(/\s*:\s*/) as [
      short: ShortFlagString,
      description: string,
    ];

    return {
      short,
      description,
    };
  } else {
    return {
      short: undefined,
      description: descSpec,
    };
  }
}
