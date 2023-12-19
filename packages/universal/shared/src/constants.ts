/**
 * The `UNINITIALIZED` symbol represents a special internal value that can be
 * used to differentiate between any user-supplied value and the state of being
 * uninitialized.
 *
 * You do not **need** to import `@starbeam/shared` to get this symbol, as it
 * is specified using `Symbol.for`.
 */
const UNINITIALIZED = Symbol.for("starbeam.UNINITIALIZED");
type UNINITIALIZED = typeof UNINITIALIZED;

/**
 * The `TAG` symbol is the protocol entry point for reactive values.
 * Implementations of the `Tagged` interface specify their reactive behavior
 * under this symbol.
 */
const TAG: unique symbol = Symbol.for("starbeam.TAG");
type TAG = typeof TAG;

/**
 * The `NOW` symbol is the name on `globalThis` that is used to store the
 * current timestamp.
 */
const COORDINATION: unique symbol = Symbol.for("starbeam.COORDINATION");
type COORDINATION = typeof COORDINATION;

export { COORDINATION, TAG, UNINITIALIZED };
