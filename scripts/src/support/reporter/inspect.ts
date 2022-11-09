export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

export interface DisplayStructOptions {
  readonly description: JSONValue;
}

export function DisplayStruct(
  name: string,
  fields: Record<PropertyKey, unknown>,
  options?: DisplayStructOptions
): object {
  let displayName = name;

  if (options?.description) {
    displayName = `${displayName} [${
      typeof options.description === "string"
        ? options.description
        : JSON.stringify(options.description)
    }]`;
  }

  const constructor = class {};
  Object.defineProperty(constructor, "name", { value: displayName });
  const object = new constructor();

  for (const [key, value] of entries(fields)) {
    Object.defineProperty(object, key, {
      value,
      enumerable: true,
    });
  }

  return object;
}

type Entries<R extends object> = { [P in keyof R]: [P, R[P]] }[keyof R];

function entries<R extends object>(object: R): Entries<R>[] {
  return Object.entries(object) as Entries<R>[];
}
