export interface DisplayStructOptions {
  readonly description: string;
}

export function DisplayStruct(
  name: string,
  fields: object,
  options?: DisplayStructOptions
) {
  let displayName = name;

  if (options?.description) {
    displayName = `${displayName} [${options.description}]`;
  }

  let constructor = class {};
  Object.defineProperty(constructor, "name", { value: displayName });
  let object = new constructor();

  for (let [key, value] of Object.entries(fields)) {
    Object.defineProperty(object, key, {
      value: value,
      enumerable: true,
    });
  }

  return object;
}
