import type { Directory } from "./paths.js";
import type { ExecOptions, Workspace } from "./workspace.js";

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
    { cwd = this.#root, output = "stream" }: Partial<ExecOptions> = {}
  ): Promise<CheckResult> {
    const check = new Check(label, command, { cwd, output });
    const result = await check.run(this.#workspace);
    this.#statuses.set(label, result);
    return result;
  }
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

  get exitCode(): number {
    return this.isOk ? 0 : 1;
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

  get exitCode(): number {
    return this.isOk ? 0 : 1;
  }
}
