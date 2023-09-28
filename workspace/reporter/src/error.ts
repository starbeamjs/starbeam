import { Result } from "@starbeam-workspace/shared";

import { fragment, type IntoFragment, isIntoFragment } from "./log.js";

export type ReportableError = Error | IntoFragment;

export interface AbstractReporter {
  reportError: (error: ReportableError, options?: ReportErrorOptions) => void;
}

export interface ReportErrorOptions {
  cause?: ReportableError;
  description?: IntoFragment;
}

export function Try<T>(fn: () => T): Result<T, ReportableError> {
  try {
    return Result.ok(fn());
  } catch (err) {
    if (err) {
      if (err instanceof Error || isIntoFragment(err)) {
        return Result.err(err);
      } else {
        return Result.err(
          fragment`An unknown error occurred (${err.constructor.name})`,
        );
      }
    } else {
      return Result.err(
        fragment`An unknown error occurred (undefined was thrown as an error)`,
      );
    }
  }
}
