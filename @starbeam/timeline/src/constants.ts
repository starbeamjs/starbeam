export const LEAF = Symbol("LEAF");
export type LEAF = typeof LEAF;

type SymbolType<T> = { [P in string]: T }[string];

export const UNINITIALIZED_REACTIVE = Symbol("UNINITIALIZED_REACTIVE");
export type UNINITIALIZED_REACTIVE = typeof UNINITIALIZED_REACTIVE;

export const IS_UPDATED_SINCE = Symbol("IS_UPDATED_SINCE");
export type IS_UPDATED_SINCE = typeof IS_UPDATED_SINCE;

export const UNINITIALIZED = Symbol("UNINITIALIZED");
export type UNINITIALIZED = typeof UNINITIALIZED;
