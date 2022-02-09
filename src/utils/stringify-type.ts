// Don't ask about this one. I have no idea what this magic is.
// Copied from https://github.com/microsoft/TypeScript/issues/13298#issuecomment-724542300.
type UnionToIntersection<U> = (
  U extends any ? (arg: U) => any : never
) extends (arg: infer I) => void
  ? I
  : never;

// Continuation of above.
type UnionToTuple<T> = UnionToIntersection<
  T extends any ? (t: T) => T : never
> extends (_: any) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : [];

// The rest below is mine.

type JSONValue =
  | boolean
  | number
  | string
  | JSONValue[]
  | { [K: string]: JSONValue };

type EscapedChar<C extends string> = C extends "\u0000"
  ? "\\\u0000"
  : C extends "\u0001"
  ? "\\\u0001"
  : C extends "\u0002"
  ? "\\\u0002"
  : C extends "\u0003"
  ? "\\\u0003"
  : C extends "\u0004"
  ? "\\\u0004"
  : C extends "\u0005"
  ? "\\\u0005"
  : C extends "\u0006"
  ? "\\\u0006"
  : C extends "\u0007"
  ? "\\\u0007"
  : C extends "\b"
  ? "\\\b"
  : C extends "\t"
  ? "\\\t"
  : C extends "\n"
  ? "\\\n"
  : C extends "\u000b"
  ? "\\\u000b"
  : C extends "\f"
  ? "\\\f"
  : C extends "\r"
  ? "\\\r"
  : C extends "\u000e"
  ? "\\\u000e"
  : C extends "\u000f"
  ? "\\\u000f"
  : C extends "\u0010"
  ? "\\\u0010"
  : C extends "\u0011"
  ? "\\\u0011"
  : C extends "\u0012"
  ? "\\\u0012"
  : C extends "\u0013"
  ? "\\\u0013"
  : C extends "\u0014"
  ? "\\\u0014"
  : C extends "\u0015"
  ? "\\\u0015"
  : C extends "\u0016"
  ? "\\\u0016"
  : C extends "\u0017"
  ? "\\\u0017"
  : C extends "\u0018"
  ? "\\\u0018"
  : C extends "\u0019"
  ? "\\\u0019"
  : C extends "\u001a"
  ? "\\\u001a"
  : C extends "\u001b"
  ? "\\\u001b"
  : C extends "\u001c"
  ? "\\\u001c"
  : C extends "\u001d"
  ? "\\\u001d"
  : C extends "\u001e"
  ? "\\\u001e"
  : C extends "\u001f"
  ? "\\\u001f"
  : C extends '"' | "\\"
  ? `\\${C}`
  : C;
type EscapedString<S extends string> = S extends `${infer C}${infer Rest}`
  ? `${EscapedChar<C>}${EscapedString<Rest>}`
  : "";
type Join<A> = A extends [string, string, ...infer Rest]
  ? `${A[0]},${Join<[A[1], ...Rest]>}`
  : A extends [string]
  ? A[0]
  : A extends []
  ? ""
  : never;
type StringifiedArray<A extends JSONValue[]> = {
  [K in keyof A]: Stringified<A[K]>;
};
type StringifiedObject<O> = {
  [K in keyof O]: `${Stringified<K>}:${Stringified<O[K]>}`;
};
type Stringified<T> = T extends number | boolean
  ? `${T}`
  : T extends string
  ? `"${EscapedString<T>}"`
  : T extends readonly any[]
  ? `[${Join<StringifiedArray<T>>}]`
  : T extends object
  ? `{${Join<ObjectValues<StringifiedObject<T>>>}}`
  : string;

type MapObjectValues<O, Keys> = {
  [K in keyof Keys]: Keys[K] extends keyof O ? O[Keys[K]] : never;
};

type ObjectValues<O> = MapObjectValues<O, UnionToTuple<keyof O>>;
