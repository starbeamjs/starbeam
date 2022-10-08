import type { Directory } from "./paths.js";
import type { Workspace } from "./workspace.js";

export class Checks {
  readonly #workspace: Workspace;
  readonly #root: Directory;
  readonly #statuses: Map<string, CheckResult>;

  constructor(workspace: Workspace, root: Directory) {
    this.#workspace = workspace;
    this.#root = root;
    this.#statuses = new Map();
  }

  get statuses(): CheckResults {
    return new CheckResults(this.#statuses);
  }

  async exec(
    label: string,
    command: string,
    {
      cwd = this.#root,
    }: {
      cwd?: Directory;
    } = {}
  ): Promise<CheckResult> {
    const check = new Check(label, command, cwd);
    const result = await check.run(this.#workspace);
    this.#statuses.set(label, result);
    return result;
  }
}

export class Check {
  #label: string;
  #command: string;
  #cwd: Directory;

  constructor(label: string, command: string, cwd: Directory) {
    this.#label = label;
    this.#command = command;
    this.#cwd = cwd;
  }

  async run(workspace: Workspace): Promise<CheckResult> {
    const result = await workspace.exec(this.#command, {
      cwd: this.#cwd.absolute,
    });

    return new CheckResult(result, this.#label, this.#command);
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

  get errors(): CheckResults {
    return new CheckResults(
      new Map([...this.#results.entries()].filter(([, r]) => !r.isOk))
    );
  }

  [Symbol.iterator](): IterableIterator<[string, CheckResult]> {
    return this.#results.entries();
  }
}

export class CheckResult {
  readonly #status: "ok" | "err";
  readonly #label: string;
  readonly #command: string;

  constructor(status: "ok" | "err", label: string, command: string) {
    this.#status = status;
    this.#label = label;
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
}
