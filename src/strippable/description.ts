/**
 * @strip.replace null
 */
export function strippableDescribe(value: unknown) {
  switch (typeof value) {
    case "bigint":
      return `a bigint`;
    case "boolean":
    case "number":
    case "string":
    case "undefined":
    case "symbol":
      return `${JSON.stringify(value)}`;
    case "function": {
      if (String(value).startsWith("class")) {
        return `class ${value.name}` || `anonymous class`;
      } else {
        return `function ${value.name}` || `anonymous function`;
      }
    }
    case "object": {
      if (value === null) {
        return `null`;
      } else {
        return `an instance of ${
          value.constructor.name || `an anonymous class`
        }`;
      }
    }
  }
}
