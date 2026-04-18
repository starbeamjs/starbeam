export function define<O extends object, K extends PropertyKey, V>(
  object: O,
  property: K,
  value: V,
): O & Record<K, V> {
  Object.defineProperty(object, property, {
    writable: true,
    enumerable: true,
    configurable: true,
    value,
  });
  return object as O & Record<K, V>;
}

/**
 * Define a property that ECMAScript provides by default but allows us to
 * override, such as `Function.prototype.name` and `Symbol.toStringTag`.
 */
define.builtin = <O extends object, K extends PropertyKey, V>(
  object: O,
  property: K,
  value: V,
): O & Record<K, V> => {
  Object.defineProperty(object, property, {
    writable: false,
    enumerable: false,
    configurable: true,
    value,
  });
  return object as O & Record<K, V>;
};

export function readonly<O extends object, K extends PropertyKey, V>(
  object: O,
  property: K,
  value: V,
): O & Record<K, V> {
  Object.defineProperty(object, property, {
    writable: false,
    enumerable: true,
    configurable: true,
    value,
  });
  return object as O & Record<K, V>;
}
