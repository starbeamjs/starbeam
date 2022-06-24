export function format(value: any): string {
  if (value === null) {
    return `null`;
  }

  /* eslint-disable */
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
      // if it's an ES6 class; detect by using F.p.toString and looking for class
      if (fn.startsWith("class")) {
        return `{class ${value.name}}`;
      } else if (fn.match(/^function\s*[*]/)) {
        return `{function* ${value.name}}`;
      } else if (fn.match(/^async\s+function/)) {
        return `{async function ${value.name}}`;
      } else if (value.name) {
        return `{${value.name}`;
      } else {
        return `{anonymous function}`;
      }
    }
    case "object": {
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
  /* eslint-enable */
}
