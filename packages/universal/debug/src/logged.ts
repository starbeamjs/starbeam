import { LOGGER } from "./logger.js";

const loggedFunction = {
  logged: undefined as LoggedFunction | undefined,
};

type LoggedFunction = <T>(value: T, log?: (value: T) => void) => T;

if (import.meta.env.DEV) {
  loggedFunction.logged = <T>(
    value: T,
    log: (value: T) => void = LOGGER.info.log
  ) => {
    log(value);
    return value;
  };
} else {
  loggedFunction.logged = <T>(value: T) => value;
}

export const logged = loggedFunction.logged;
