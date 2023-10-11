import { FATAL_EXIT_CODE, OK_EXIT_CODE } from "@starbeam-workspace/shared";
import type { Directory } from "trailway";

import type { Workspace } from "./interfaces.js";

export type CommandOutputType = "stream" | "when-error";

export interface ExecOptions {
  cwd: Directory;
  output?: CommandOutputType;
}

export class Check {
  #label: string;
  #command: string;
  #options: ExecOptions;

  constructor(label: string, command: string, options: ExecOptions) {
    this.#label = label;
    this.#command = command;
    this.#options = options;
  }

  async run(workspace: Workspace): Promise<CheckResult> {
    const result = await workspace.exec(this.#command, {
      cwd: this.#options.cwd.absolute,
      label: this.#label,
      output: this.#options.output ?? "stream",
      breakBefore: true,
    });

    return new CheckResult(result, this.#command);
  }
}

export class GroupedCheckResults {
  static empty(): GroupedCheckResults {
    return new GroupedCheckResults(new Map());
  }

  static is(results: unknown): results is GroupedCheckResults {
    return !!(results && results instanceof GroupedCheckResults);
  }

  readonly #results: Map<string, CheckResults>;

  constructor(results: Map<string, CheckResults>) {
    this.#results = results;
  }

  add(label: string, result: CheckResults): void {
    this.#results.set(label, result);
  }

  [Symbol.iterator](): Iterator<[string, CheckResults]> {
    return this.#results.entries();
  }

  get isOk(): boolean {
    return [...this.#results.values()].every((results) => results.isOk);
  }

  get errors(): Map<string, CheckResults> {
    const errors = new Map();
    for (const [label, results] of this.#results) {
      if (!results.isOk) {
        errors.set(label, results);
      }
    }

    return errors;
  }
}

export class CheckResults implements Iterable<[string, CheckResult]> {
  static is(results: unknown): results is CheckResults {
    return !!(results && results instanceof CheckResults);
  }

  readonly #results: Map<string, CheckResult>;

  constructor(results: Map<string, CheckResult>) {
    this.#results = results;
  }

  get isOk(): boolean {
    return [...this.#results.values()].every((r) => r.isOk);
  }

  get exitCode(): number {
    return this.isOk ? OK_EXIT_CODE : FATAL_EXIT_CODE;
  }

  get errors(): CheckResults {
    return new CheckResults(
      new Map([...this.#results.entries()].filter(([, r]) => !r.isOk)),
    );
  }

  [Symbol.iterator](): IterableIterator<[string, CheckResult]> {
    return this.#results.entries();
  }
}

export class CheckResult {
  readonly #status: "ok" | "err";
  readonly #command: string;

  constructor(status: "ok" | "err", command: string) {
    this.#status = status;
    this.#command = command;
  }

  get status(): "ok" | "err" {
    return this.#status;
  }

  get isOk(): boolean {
    return this.#status === "ok";
  }

  get command(): string {
    return this.#command;
  }

  get exitCode(): number {
    return this.isOk ? OK_EXIT_CODE : FATAL_EXIT_CODE;
  }
}
