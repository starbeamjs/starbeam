/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import React from "react";

/**
 * Allow Starbeam to set IS_RESTRICTED to true in situations (such as the
 * lifecycle constructor), thare sometimes rendering and sometimes not (and
 * therefore should always be treated as readonly to prevent writes from
 * occurring).
 */
let IS_RESTRICTED = false;

export function beginReadonly(): void {
  IS_RESTRICTED = true;
}

export function endReadonly(): void {
  IS_RESTRICTED = false;
}

/**
 * If the current active render reads from a reactive value, and the reactive
 * value is already set up to notify React in the context of another frame
 * (that will **reliably** update as the same rate as the this read), then we
 * can avoid the "untracked read" error by wrapping the consumption in
 * {@linkcode unsafeTrackedElsewhere} and {@linkcode
 * endUnsafeTrackedElsewhere}.
 */
let IS_UNRESTRICTED = false;

/**
 * This function is used in the fundamental `@starbeam/react` building blocks
 * (such as `useReactive`) that glue Starbeam reactive values into React's
 * rendering. These building blocks directly subscribe to changes in reactive
 * values (and unsubscribe when the component is unmounted), but they also need
 * to return the current value of the reactive without triggering the
 * "untracked read" error.
 *
 * The functionality in this file **does not** change the semantics or behavior
 * of the reactive system, but rather allows `@starbeam/react` to produce a
 * user-friendly error message when the user attempts to read from a reactive
 * value outside of a component (which wouldn't update reliably).
 *
 * User code (and higher-level functions of `@starbeam/react`) should not use
 * this function directly.
 */
export function unsafeTrackedElsewhere<T>(callback: () => T): T {
  const current = IS_UNRESTRICTED;
  IS_UNRESTRICTED = true;

  try {
    return callback();
  } finally {
    IS_UNRESTRICTED = current;
  }
}

/**
 * This function is used to wrap the setup function of a component, so that it
 * can read from reactive values without triggering the "untracked read" error.
 */
export function setupFunction<T>(callback: () => T): T {
  const current = IS_UNRESTRICTED;
  IS_UNRESTRICTED = true;

  try {
    return callback();
  } finally {
    IS_UNRESTRICTED = current;
  }
}

/**
 * Returns true if reading from a reactive value is currently disallowed
 * (because React is currently rendering a component, and we're not in an
 * unrestricted context, such as setup).
 */
export function isRestrictedRead(): boolean {
  if (IS_UNRESTRICTED) {
    return false;
  }

  return (
    // @ts-expect-error intentionally using React internals
    !!React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner
      .current || IS_RESTRICTED
  );
}
