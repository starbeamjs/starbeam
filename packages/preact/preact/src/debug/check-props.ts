const ReactPropTypesSecret = "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";

let loggedTypeFailures: Record<string, boolean> = {};

/**
 * Reset the history of which prop type warnings have been logged.
 */
export function resetPropWarnings(): void {
  loggedTypeFailures = {};
}

/**
 * Assert that the values match with the type specs.
 * Error messages are memorized and will only be shown once.
 *
 * Adapted from https://github.com/facebook/prop-types/blob/master/checkPropTypes.js
 *
 * @param typeSpecs Map of name to a ReactPropType
 * @param values Runtime values that need to be type-checked
 * @param location e.g. "prop", "context", "child context"
 * @param componentName Name of the component for error messages.
 * @param getStack Returns the component stack.
 */
export function checkPropTypes(
  typeSpecs: Record<string, any>,
  values: object,
  location: string,
  componentName: string,
  getStack?: ((...args: any[]) => any) | null
): void {
  Object.keys(typeSpecs).forEach((typeSpecName) => {
    let error;
    try {
      error = typeSpecs[typeSpecName](
        values,
        typeSpecName,
        componentName,
        location,
        null,
        ReactPropTypesSecret
      );
    } catch (e) {
      error = e;
    }
    if (error && !(error.message in loggedTypeFailures)) {
      loggedTypeFailures[error.message] = true;
      console.error(
        `Failed ${location} type: ${error.message}${
          (getStack && `\n${getStack()}`) || ""
        }`
      );
    }
  });
}
