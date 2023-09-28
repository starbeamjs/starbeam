import {
  getFirst,
  getLast,
  isArray,
  isSingleItemArray,
} from "@starbeam/core-utils";
import type { command } from "@starbeam-dev/schemas";
import type { Command as CommanderCommand } from "commander";

import { type LongFlagString, type ShortFlagString } from "./shared.js";

export interface CommandParameter {
  applyTo: (command: CommanderCommand) => CommanderCommand;
}

export class BooleanFlag implements CommandParameter {
  static of = (spec: command.FlagSpec): BooleanFlag => {
    return new BooleanFlag(spec);
  };

  readonly #name: BooleanFlagName;
  readonly #desc: Desc;

  private constructor(spec: command.FlagSpec) {
    const [long, desc] = spec;
    this.#name = BooleanFlagName.of(long);
    this.#desc = Desc.of(desc);
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
  static of = (spec: command.ValuedOptionSpec): ValuedOption => {
    return new ValuedOption(spec);
  };

  readonly #long: LongFlag;
  readonly #desc: Desc;
  readonly #type: Type<command.OptionValue> | undefined;

  private constructor(spec: command.ValuedOptionSpec) {
    const [rawLong, rawDesc, rawType] = spec;

    this.#long = LongFlag.of(rawLong);
    this.#desc = Desc.of(rawDesc);
    this.#type = rawType ? Type.of(rawType) : undefined;
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
  static of = (spec: command.ArgSpec): Arg => {
    return new Arg(spec);
  };

  readonly #desc: ArgDesc;
  // eslint-disable-next-line no-unused-private-class-members -- @todo
  readonly #type: Type;

  private constructor(spec: command.ArgSpec) {
    const [desc, type] = spec;
    this.#desc = ArgDesc.of(desc);
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

class Desc {
  static of(spec: string): Desc {
    return new Desc(spec);
  }

  readonly #unpacked: UnpackedDescSpec;

  private constructor(spec: string) {
    this.#unpacked = unpackDescSpec(spec);
  }

  get description(): string {
    return this.#unpacked.description;
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
    const longFlag = `${this.flag} ${this.label}`;
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
  static of(spec: command.ArgDesc): ArgDesc {
    return new ArgDesc(spec);
  }

  readonly #label: string;
  readonly #required: boolean;
  readonly #description: string;

  private constructor(spec: command.ArgDesc) {
    const { label, required, description } = unpackArgDesc(spec);

    this.#label = label;
    this.#required = required;
    this.#description = description;
  }

  get description(): string {
    return this.#description;
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
