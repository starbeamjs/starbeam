import { assert } from "./utils.js";

class Source {
  static of(original: string): Source {
    return new Source(original);
  }

  readonly #original: string;

  constructor(original: string) {
    this.#original = original;
  }

  get original(): string {
    return this.#original;
  }
}

export class Name {
  static of(original: string): Name {
    return new Name(original);
  }

  readonly #original: string;

  constructor(original: string) {
    this.#original = original;
  }

  get original(): string {
    return this.#original;
  }
}

const ANONYMOUS_FRAME = /^at (?<source>.*):(?<line>\d+):(?<column>\d+)$/;

interface FrameGroups {
  readonly source: string;
  readonly line: string;
  readonly column: string;
}

function isFrameGroups(
  groups: Record<string, unknown> | FrameGroups | undefined
): groups is FrameGroups {
  return (
    groups !== undefined &&
    typeof groups.source === "string" &&
    typeof groups.line === "string" &&
    typeof groups.column === "string"
  );
}

const NAMED_FRAME =
  /^at (?<name>.*) [(](?<source>.*):(?<line>\d+):(?<column>\d+)[)]$/;

interface NamedGroups {
  readonly name: string;
  readonly source: string;
  readonly line: string;
  readonly column: string;
}

function isNamedGroups(
  groups: Record<string, unknown> | NamedGroups | undefined
): groups is NamedGroups {
  return isFrameGroups(groups) && typeof groups.name === "string";
}

export abstract class Frame {
  static original(frame: Frame): string {
    return frame.#original;
  }

  static parse(original: string): Frame {
    const trimmed = original.trim();
    const named = NAMED_FRAME.exec(trimmed);

    if (named) {
      assert(
        isNamedGroups(named.groups),
        `Since the named frame regular expression (${NAMED_FRAME}) succeeded on the source line (${JSON.stringify(
          original
        )}), we expect the match object to have all of the named groups in it`
      );

      const { name, source, line, column } = named.groups;
      return NamedFrame.create(original, {
        source,
        name,
        location: Location.create(Number(line), Number(column)),
      });
    }

    const anonymous = ANONYMOUS_FRAME.exec(original);

    if (anonymous) {
      assert(
        isFrameGroups(anonymous.groups),
        `Since the named frame regular expression (${ANONYMOUS_FRAME}) succeeded on the source line (${JSON.stringify(
          original
        )}), we expect the match object to have all of the frame groups in it`
      );

      const { source, line, column } = anonymous.groups;
      return AnonymousFrame.create(original, {
        source,
        location: Location.create(Number(line), Number(column)),
      });
    }

    return UnknownFrame.create(original);
  }

  abstract get display(): string;

  readonly #original: string;

  protected constructor(original: string) {
    this.#original = original;
  }

  get location(): Location | null {
    return null;
  }

  get source(): string | null {
    return null;
  }
}

export class Location {
  static create(line: number, column: number) {
    return new Location(line, column);
  }

  private constructor(readonly line: number, readonly column: number) {}

  get display(): string {
    return `${this.line}:${this.column}`;
  }
}

export abstract class KnownFrame extends Frame {
  readonly #source: Source;
  readonly #location: Location;

  protected constructor(original: string, source: Source, location: Location) {
    super(original);

    this.#source = source;
    this.#location = location;
  }

  get at(): string {
    return `${this.source}:${this.#location.line}:${this.#location.column}`;
  }

  get display(): string {
    return `at ${this.at}`;
  }

  get source(): string {
    return this.#source.original;
  }

  get location(): Location {
    return this.#location;
  }
}

export class NamedFrame extends KnownFrame {
  static create(
    original: string,
    {
      source,
      name,
      location,
    }: { source: string; name: string; location: Location }
  ): NamedFrame {
    return new NamedFrame(original, Source.of(source), Name.of(name), location);
  }

  readonly #name: Name;

  private constructor(
    original: string,
    source: Source,
    name: Name,
    location: Location
  ) {
    super(original, source, location);

    this.#name = name;
  }

  get display(): string {
    return `at ${this.name} (${this.at})`;
  }

  get name(): string {
    return this.#name.original;
  }
}

export class AnonymousFrame extends Frame {
  static create(
    original: string,
    { source, location }: { source: string; location: Location }
  ): AnonymousFrame {
    return new AnonymousFrame(original, Source.of(source), location);
  }

  readonly #source: Source;
  readonly #location: Location;

  private constructor(original: string, source: Source, location: Location) {
    super(original);

    this.#source = source;
    this.#location = location;
  }

  get display(): string {
    return `at ${this.#source}:${this.#location.line}:${this.#location.column}`;
  }

  get source(): string {
    return this.#source.original;
  }

  get location(): Location {
    return this.#location;
  }
}

export class UnknownFrame extends Frame {
  static create(source: string, trimmed = source.trim()): UnknownFrame {
    return new UnknownFrame(source, source.trim());
  }

  readonly #trimmed: string;

  constructor(original: string, trimmed: string) {
    super(original);
    this.#trimmed = trimmed;
  }

  get display(): string {
    return this.#trimmed;
  }
}
