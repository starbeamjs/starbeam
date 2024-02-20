export function format(value: unknown): string {
  switch (typeof value) {
    case "boolean":
    case "number":
    case "undefined":
    case "symbol":
      return String(value);
    case "bigint":
      return `${value}n`;
    case "string":
      return JSON.stringify(value);
    case "function": {
      const fn = String(value);
      // if it's an ES6 class; detect by using F.p.toString and looking for
      // class
      if (fn.startsWith("class")) {
        return `{class ${value.name}}`;
      } else if (/^function\s*[*]/.exec(fn)) {
        return `{function* ${value.name}}`;
      } else if (/^async\s+function/.exec(fn)) {
        return `{async function ${value.name}}`;
      } else if (value.name) {
        return `{${value.name}`;
      } else {
        return `{anonymous function}`;
      }
    }
    case "object": {
      if (value === null) {
        return `null`;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const proto = Object.getPrototypeOf(value);

      if (proto === null || proto === Object.prototype) {
        const entries = Object.entries(value)
          .map(([key, value]) => `${key}: ${format(value)}`)
          .join(", ");
        return `{ ${entries} }`;
      } else if (value.constructor.name) {
        return `{${value.constructor.name} instance}`;
      } else {
        return `{anonymous instance}`;
      }
    }
  }
}
