const UNINITIALIZED = Symbol.for("starbeam.UNINITIALIZED");
type UNINITIALIZED = typeof UNINITIALIZED;

const REACTIVE: unique symbol = Symbol.for("starbeam.REACTIVE");
type REACTIVE = typeof REACTIVE;

export { REACTIVE, UNINITIALIZED };
