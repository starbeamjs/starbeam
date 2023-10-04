class Format {
  #type;

  constructor(type) {
    this.#type = type;
  }

  [Symbol.for("nodejs.util.inspect.custom")](_, { stylize }) {
    return stylize("testing", this.#type);
  }
}

const STYLES = [
  "special",
  "number",
  "bigint",
  "boolean",
  "undefined",
  "null",
  "string",
  "symbol",
  "date",
  "regexp",
  "module",
];

for (const style of STYLES) {
  console.log(new Format(style), style);
}
