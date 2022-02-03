export const DEBUG = Symbol.for("starbeam.debug");

class Buffer {
  static empty(): Buffer {
    return new Buffer("", 0);
  }

  static serialize(buffer: Buffer): string {
    return buffer.#buffer;
  }

  #buffer: string;
  #indents = 0;

  constructor(buffer: string, indents: number) {
    this.#buffer = buffer;
    this.#indents = indents;
  }

  get #indentation(): string {
    return "  ".repeat(this.#indents);
  }

  start(): void {
    this.#buffer += this.#indentation;
  }

  end(): void {
    this.#buffer += `\n`;
  }

  fragment(contents: string): void {
    this.#buffer += contents;
  }

  indent(): void {
    this.#indents += 1;
  }

  outdent(): void {
    this.#indents -= 1;
  }
}

export class ContentBuilder {
  static empty(): ContentBuilder {
    return new ContentBuilder([]);
  }

  static serialize(builder: ContentBuilder): string {
    let buffer = Buffer.empty();
    console.log(builder.#atoms);
    ContentBuilder.finalize(builder).append(buffer);
    return Buffer.serialize(buffer);
  }

  static finalize(builder: ContentBuilder): Content {
    if (builder.#atoms.length === 0) {
      return EMPTY;
    } else if (builder.#atoms.length === 1) {
      return builder.#atoms[0];
    } else {
      return new Group(builder.#atoms);
    }
  }

  readonly #atoms: Atom[];

  constructor(content: Atom[]) {
    this.#atoms = content;
  }

  readonly line = {
    start: (content?: string): ContentBuilder => {
      this.#atoms.push(START_LINE);
      if (content) {
        this.fragment(content);
      }
      return this;
    },

    end: (content: string): ContentBuilder => {
      this.fragment(content);
      this.line.new();
      return this;
    },

    next: (content: string): ContentBuilder => {
      this.line.new();
      this.fragment(content);
      return this;
    },

    new: (): ContentBuilder => {
      this.#atoms.push(END_LINE);
      return this;
    },
  } as const;

  debug(value: unknown): ContentBuilder {
    switch (typeof value) {
      case "object": {
        if (value === null) {
          return this.fragment(`null`);
        } else if (Array.isArray(value)) {
          return this.debug(FormatArray.of(value));
        } else if (isDebug(value)) {
          value[DEBUG](this);
          return this;
        } else {
          break;
        }
      }

      case "function": {
        if (value.name) {
          return this.fragment(`function ${value.name}`);
        } else {
          return this.fragment(`(anonymous function)`);
        }
      }
    }

    throw Error("todo: Not implemented: defaultDebug");
    return this;
  }

  add(content: Content): ContentBuilder {
    this.#atoms.push(...content.atoms);
    return this;
  }

  mapped<T>(
    items: Iterable<T>,
    mapper: (builder: ContentBuilder, value: T) => ContentBuilder
  ): ContentBuilder {
    for (let item of items) {
      mapper(this, item);
    }

    return this;
  }

  nest(callback: (builder: ContentBuilder) => ContentBuilder): ContentBuilder {
    this.#atoms.push(INDENT);
    callback(this);
    this.#atoms.push(OUTDENT);
    return this;
  }

  fragment(content: string): ContentBuilder {
    this.#atoms.push(new Fragment(content));
    return this;
  }

  serialize(): string {
    let buffer = Buffer.empty();

    for (let atom of this.#atoms) {
      atom.append(buffer);
    }

    return Buffer.serialize(buffer);
  }
}

interface Content {
  append(buffer: Buffer): void;
  readonly atoms: readonly Atom[];
}

class Indent implements Content {
  append(buffer: Buffer): void {
    buffer.indent();
  }

  readonly atoms = [this];
}

const INDENT = new Indent();

class Outdent implements Content {
  append(buffer: Buffer): void {
    buffer.outdent();
  }

  readonly atoms = [this];
}

const OUTDENT = new Outdent();

class StartLine implements Content {
  append(buffer: Buffer): void {
    buffer.start();
  }

  readonly atoms = [this];
}

const START_LINE = new StartLine();

class EndLine implements Content {
  append(buffer: Buffer): void {
    buffer.end();
  }

  readonly atoms = [this];
}

const END_LINE = new EndLine();

class Fragment implements Content {
  constructor(readonly contents: string) {}

  append(buffer: Buffer): void {
    buffer.fragment(this.contents);
  }

  readonly atoms = [this];
}

class Empty implements Content {
  append(_buffer: Buffer) {
    // noop
  }

  readonly atoms = [];
}

const EMPTY = new Empty();

type Atom = Fragment | StartLine | EndLine;

class Group implements Content {
  constructor(readonly atoms: readonly Atom[]) {}

  append(buffer: Buffer): void {
    for (let item of this.atoms) {
      item.append(buffer);
    }
  }
}

export function content(string: string): Content {
  let lines = string.split("\n");

  if (lines.length === 0) {
    return EMPTY;
  } else if (lines.length === 1) {
    return new Group([new Fragment(string), START_LINE]);
  } else {
    let [first, ...rest] = lines;
    let last = rest.pop();

    let atoms: Atom[] = [new Fragment(first)];

    for (let item of rest) {
      atoms.push(START_LINE, new Fragment(item), END_LINE);
    }

    if (last) {
      atoms.push(START_LINE, new Fragment(last));
    }

    return new Group(atoms);
  }
}

export interface Debug {
  [DEBUG](builder: ContentBuilder): ContentBuilder;
}

function isDebug(value: unknown): value is Debug {
  return typeof value === "object" && value !== null && DEBUG in value;
}

export function debug(value: unknown): string {
  let builder = ContentBuilder.empty();

  builder.debug(value);

  return ContentBuilder.serialize(builder);
}

class FormatArray implements Debug {
  static of(array: readonly unknown[]): FormatArray {
    return new FormatArray(array);
  }

  readonly #array: readonly unknown[];

  constructor(array: readonly unknown[]) {
    this.#array = array;
  }

  [DEBUG](builder: ContentBuilder): ContentBuilder {
    return builder.line
      .end(`[`)
      .nest((nested) => nested.mapped(this.#array, (b, item) => b.debug(item)))
      .line.next(`]`);
  }
}
