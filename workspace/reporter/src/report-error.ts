/* eslint-disable no-console */
import chalk from "chalk";

import type { ReportErrorOptions } from "./error.js";
import { wrapIndented } from "./format.js";
import { Fragment, type IntoFragment, Style } from "./log.js";
import type { States } from "./logger.js";

export class ReportError {
  static create(
    error: Error | IntoFragment,
    options: ReportErrorOptions = {},
  ): ReportError {
    return new ReportError(error, options);
  }

  readonly #error: Error | IntoFragment;
  readonly #options: ReportErrorOptions;

  constructor(error: Error | IntoFragment, options: ReportErrorOptions) {
    this.#error = error;
    this.#options = options;
  }

  log(states: States): void {
    this.#logMainError(states);
    this.#logDescription(states);
    this.#logCause(states);
  }

  #logDescription(states: States): void {
    const { description } = this.#options;
    if (!description) return;

    states.logln(Fragment.from(description).defaultStyle("warning"), {
      logger: "warn",
    });
  }

  #logCause(states: States): void {
    const { cause } = this.#options;
    if (!cause) return;

    states.logln("");
    states.logln(chalk.redBright.inverse("Caused by"), {
      logger: console.group,
    });

    this.#logError(states, cause);

    console.groupEnd(); // intentionally manual
  }

  #logMainError(states: States): void {
    this.#logError(states, this.#error);
  }

  #logError(states: States, e: Error | IntoFragment): void {
    states.logln(chalk.redBright("An unexpected error occurred:"), {
      logger: console.group,
    });

    if (e && e instanceof Error) {
      states.logln(
        chalk.redBright(
          wrapIndented(e.message, { leading: { indents: states.leading } }),
        ),
      );
      states.logln("");
      states.logln(chalk.redBright.inverse("Stack trace"), {
        logger: console.group,
      });
      states.logln(
        chalk.grey.dim(
          wrapIndented(e.stack ?? "", { leading: { indents: states.leading } }),
        ),
      );
      console.groupEnd(); // intentionally manual
    } else {
      states.logln(
        Fragment.from(e)
          .defaultStyle(Style.header("warning"))
          .stringify(states.current),
      );
      console.groupEnd(); // intentionally manual
    }

    this.#logDescription(states);
  }
}
