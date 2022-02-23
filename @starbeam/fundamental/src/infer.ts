/**
 * Use this type to force TypeScript to accept the inferred function body's
 * return type as compatible with the function's signature.
 *
 * In general, this is necessary when the signature uses generics and mapped
 * types, but the function body uses `unknown` (because the generics are not
 * reified as a runtime concept in TypeScript).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferReturn = any;

/**
 * Use this type to force TypeScript to accept an argument as compatible with
 * the function's signature. return type as compatible with the signature of a
 * function it is used inside of.
 *
 * In general, this is necessary when the signature uses generics and mapped
 * types, but the function body uses `unknown` (because the generics are not
 * reified as a runtime concept in TypeScript).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InferArgument = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UnsafeAny = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyKey = keyof any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SymbolKey = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyIndex = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyIndexValue = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Metaprogramming = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRecord<V = any> = { [P in keyof any]: V };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDict = { [P in keyof any as Extract<P, string>]: any };
