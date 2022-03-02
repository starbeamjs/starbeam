export function DisplayStruct(name: string, fields: object) {
  let object = Object.create(null);

  let constructor = () => null;
  Object.defineProperty(constructor, "name", { value: name });

  Object.defineProperty(object, "constructor", {
    enumerable: false,
    value: constructor,
  });

  for (let [key, value] of Object.entries(fields)) {
    Object.defineProperty(object, key, {
      value: value,
      enumerable: true,
    });
  }

  return object;
}
