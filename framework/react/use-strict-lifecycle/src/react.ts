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

export function isRendering() {
  return (
    // @ts-expect-error intentionally using React internals
    !!React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner
      .current || IS_RESTRICTED
  );
}
