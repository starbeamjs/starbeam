// const current = checked(
//   state.current,
//   RestingReactState.is,
//   (current) =>
//     `Inside of useLayoutEffect, a component's state should be Rendered, Attached or Deactivated. Instead, we got ${current.type}. ${BUG}`
// );

import {
  DeactivatedReactState,
  InstantiatedReactState,
  ReadyReactState,
  RenderedReactState,
  type PreparedForActivationReactState,
  type ReactState,
} from "./states.js";
import type { Check } from "./utils.js";

const BUG = `This is not expected by @starbeam/resource, and is either a bug or a change in React behavior. Please file a bug.`;

interface Type<T, S extends ReactState<T>> {
  is: (value: ReactState<T>) => value is S;
  kind: string;
}

interface Options {
  readonly situation: string;
}

export function isState<T, S extends ReactState<T>>(
  Type: Type<T, S>[],
  { situation }: Options
): Check<S, ReactState<T>> {
  if (Array.isArray(Type)) {
    if (Type.length === 1) {
      const type = Type[0];

      return {
        test: type.is,
        failure: (value: ReactState<T>): string =>
          `${situation}, a component's state should be ${type.kind}. Instead, we got ${value.type}. ${BUG}`,
      };
    } else {
      const types = Type;

      function isOneOf<T>(value: ReactState<T>): value is S {
        return types.some((type) => type.is(value));
      }

      return {
        test: isOneOf,
        failure: (value: ReactState<T>): string =>
          `${situation}, a component's state should be one of: ${types.join(
            ", "
          )}. Instead, we got ${value.type}. ${BUG}`,
      };
    }
  } else {
    return isState([Type], { situation });
  }
}

export const isReadyState = <T>(options: Options) =>
  isState<T, ReadyReactState<T>>([ReadyReactState], options);

export function isAttachedState<T>({
  situation,
}: {
  situation: string;
}): Check<InstantiatedReactState<T>, ReactState<T>> {
  return {
    test: (value): value is InstantiatedReactState<T> =>
      InstantiatedReactState.is(value) && value.type === "Attached",
    failure: (value: ReactState<T>): string =>
      `${situation}, a component's state should be Attached. Instead, we got ${value.type}. ${BUG}`,
  };
}

export function isPreparedForActivationState<T>({
  situation,
}: {
  situation: string;
}): Check<RenderedReactState<T> | DeactivatedReactState<T>, ReactState<T>> {
  return {
    test: (value: ReactState<T>): value is PreparedForActivationReactState<T> =>
      RenderedReactState.is(value) || DeactivatedReactState.is(value),
    failure: (value: ReactState<T>): string =>
      `${situation}, a component's state should be Rendered or Deactivated. Instead, we got ${value.type} (${value.constructor.name}). ${BUG}`,
  };
}
