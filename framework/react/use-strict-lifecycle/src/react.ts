/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import React from "react";

/**
 * Allow Starbeam to set IS_RESTRICTED to true in situations (such as the lifecycle constructor), thare
 * sometimes rendering and sometimes not (and therefore should always be treated as readonly to
 * prevent writes from occurring).
 */
let IS_RESTRICTED = false;

export function beginReadonly() {
  IS_RESTRICTED = true;
}

export function endReadonly() {
  IS_RESTRICTED = false;
}

/**
 * If the current active render reads from a reactive value, and the reactive value is already set
 * up to notify React in the context of another frame (that will **reliably** update as the same
 * rate as the this read), then we can avoid the "untracked read" error by wrapping the consumption
 * in {@linkcode unsafeTrackedElsewhere} and {@linkcode endUnsafeTrackedElsewhere}.
 */
let IS_UNRESTRICTED = false;

export function unsafeTrackedElsewhere<T>(callback: () => T): T {
  const current = IS_UNRESTRICTED;
  IS_UNRESTRICTED = true;

  try {
    return callback();
  } finally {
    IS_UNRESTRICTED = current;
  }
}

export function endUnsafeTrackedElsewhere() {
  IS_RESTRICTED = true;
}

export function isRestrictedRead() {
  if (IS_UNRESTRICTED) {
    return false;
  }

  return (
    // @ts-expect-error intentionally using React internals
    !!React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner
      .current || IS_RESTRICTED
  );
}
