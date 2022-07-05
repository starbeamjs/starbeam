export class Style {
  static create(property: string, value: string): Style {
    return new Style(property, value);
  }

  #property: string;
  #value: string;

  constructor(property: string, value: string) {
    this.#property = property;
    this.#value = value;
  }

  toCSS() {
    return `${this.#property}: ${this.#value};`;
  }
}

export class Styles {
  #styles: Style[] = [];

  add(property: string, value: string) {
    this.#styles.push(Style.create(property, value));
  }

  toCSS() {
    return this.#styles.map((style) => style.toCSS()).join(" ");
  }
}

export class Fragment {
  #content: string;
  #styles: Styles = new Styles();

  constructor(content: string) {
    this.#content = content;
  }

  css(style: `${string}:${string}`) {
    const [property, value] = style.split(":");
    this.#styles.add(property.trim(), value.trim());
    return this;
  }

  append(buffer: Buffer) {
    buffer.add(this.#content, this.#styles.toCSS());
  }
}

export function Styled(content: string) {
  return new Fragment(content);
}

export type IntoFragment =
  | string
  | [content: string, ...styles: `${string}:${string}`[]];

export type IntoBlock = IntoFragment[] | "";

export class Block {
  #fragments: Fragment[] = [];

  add(fragment: Fragment | string) {
    if (typeof fragment === "string") {
      this.#fragments.push(new Fragment(fragment));
    } else {
      this.#fragments.push(fragment);
    }
  }

  appendTo(buffer: Buffer) {
    for (const fragment of this.#fragments) {
      fragment.append(buffer);
    }
  }
}

export class Blocks {
  #blocks: Block[] = [];

  add(block: Block | string) {
    if (typeof block === "string") {
      const b = new Block();
      b.add(block);
      this.#blocks.push(new Block());
    } else {
      this.#blocks.push(block);
    }
  }

  appendTo(buffer: Buffer) {
    for (const block of this.#blocks) {
      block.appendTo(buffer);
      buffer.break();
    }
  }
}

export function Message(into: IntoBlock[], options?: { plain: boolean }) {
  const blocks = new Blocks();

  for (const intoBlock of into) {
    const block = new Block();
    for (const fragment of intoBlock) {
      if (typeof fragment === "string") {
        block.add(fragment);
      } else {
        const [content, ...styles] = fragment;

        const f = Styled(content);

        for (const style of styles) {
          f.css(style);
        }

        block.add(f);
      }
    }
    blocks.add(block);
  }

  const buffer = new Buffer(options?.plain ?? false);

  blocks.appendTo(buffer);

  return buffer.message();
}

class Buffer {
  static styled() {
    return new Buffer(false);
  }

  static plain() {
    return new Buffer(true);
  }

  #message: string[] = [];
  #current: string = "";
  #styles: string[] = [];
  #plain: boolean;

  constructor(plain: boolean) {
    this.#plain = plain;
  }

  add(content: string, style?: string) {
    if (style && !this.#plain) {
      this.#current += `%c${content}`;
      this.#styles.push(style);
    } else {
      this.#current += content;
    }
  }

  message(): unknown[] {
    if (this.#current) {
      this.break();
    }

    return [this.#message.join("\n"), ...this.#styles];
  }

  break() {
    this.#message.push(this.#current);
    this.#current = "";
  }
}
