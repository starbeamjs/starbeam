interface DebugInformation {
  description?: string;
}

type ToDebugInformation = DebugInformation | string;

function toDebugInformation(info: ToDebugInformation): DebugInformation;
function toDebugInformation(
  info: ToDebugInformation | undefined,
  defaultValue: ToDebugInformation
): DebugInformation;
function toDebugInformation(
  info: ToDebugInformation | undefined,
  defaultValue?: ToDebugInformation
): DebugInformation {
  if (typeof info === "string") {
    return {
      description: info,
    };
  } else if (info === undefined) {
    return toDebugInformation(defaultValue as ToDebugInformation);
  } else {
    return info;
  }
}

/**
 * @strip.noop
 */
export function assert(
  condition: any,
  info: ToDebugInformation = "assertion error"
): asserts condition {
  if (condition === false) {
    let debug = toDebugInformation(info);
    throw Error(`Unexpected: ${debug.description}`);
  }
}

/**
 * @strip.value value
 */
export function present<T>(
  value: T | null | undefined,
  info?: ToDebugInformation
): T {
  if (value === null) {
    throw Error(toDebugInformation(info, "unexpected null").description);
  } else if (value === undefined) {
    throw Error(toDebugInformation(info, "unexpected undefined").description);
  } else {
    return value;
  }
}

/**
 * @strip.noop
 */
export function verify<Out extends In, In = unknown>(
  value: In,
  predicate: (value: In) => value is Out,
  error: (value: In) => ToDebugInformation = () => "assertion failed"
): asserts value is Out {
  if (!predicate(value)) {
    throw Error(toDebugInformation(error(value)).description);
  }
}

/**
 * @strip.value value
 */
export function verified<Out extends In, In = unknown>(
  value: In,
  predicate: (value: In) => value is Out,
  error: (value: In) => ToDebugInformation = () => "assertion failed"
): Out {
  if (predicate(value)) {
    return value;
  } else {
    throw Error(toDebugInformation(error(value)).description);
  }
}

export function exhaustive(_value: never, type?: string): never {
  if (type) {
    throw Error(`unexpected types left in ${type}`);
  } else {
    throw Error(`unexpected types left`);
  }
}
