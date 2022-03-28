import type { EnvironmentContext, JestEnvironment } from "@jest/environment";
import type { LegacyFakeTimers, ModernFakeTimers } from "@jest/fake-timers";
import type { Circus, Config, Global as JestGlobal } from "@jest/types";
import ImportedNodeEnvironment from "jest-environment-node";
import type { ModuleMocker } from "jest-mock";
import { TextEncoder } from "util";
import type { Context } from "vm";

declare interface Timer {
  readonly id: number;
  readonly ref: () => Timer;
  readonly unref: () => Timer;
}

declare class NodeEnv extends JestEnvironment<Timer> {
  constructor(config: Config.ProjectConfig, context?: EnvironmentContext);
}

interface NodeEnv {
  context: EnvironmentContext | null;
  fakeTimers: LegacyFakeTimers<Timer> | null;
  fakeTimersModern: ModernFakeTimers | null;
  global: JestGlobal.Global;
  moduleMocker: ModuleMocker | null;

  setup(): Promise<void>;
  teardown(): Promise<void>;
  getVmContext(): Context | null;
}

const NodeEnvironment = ImportedNodeEnvironment as typeof NodeEnv;

type DocblockPragmas = Record<string, string | readonly string[]>;

class CustomEnvironment
  extends NodeEnvironment
  implements JestEnvironment<Timer>
{
  readonly #console: Console;
  readonly #testPath: string | undefined;
  readonly #docblockPragmas: DocblockPragmas | undefined;

  constructor(config: Config.ProjectConfig, context?: EnvironmentContext) {
    let console = globalThis.console;
    super(config, context);

    this.#console = console;

    Object.defineProperty(this.global, "console", {
      enumerable: true,
      configurable: false,
      get: () => console,
      set: () => {
        // console.log(
        //   `Someone (probably jest) is attempting to hijack console. Ignoring.`
        // );
      },
    });

    this.#testPath = context?.testPath;
    this.#docblockPragmas = context?.docblockPragmas;
  }

  get fakeTimers(): LegacyFakeTimers<Timer> | null {
    return super.fakeTimers;
  }

  get fakeTimersModern(): ModernFakeTimers | null {
    return super.fakeTimersModern;
  }

  get moduleMocker(): ModuleMocker | null {
    return super.moduleMocker;
  }

  async setup() {
    await super.setup();

    Object.defineProperty(this.global, "TextEncoder", {
      enumerable: true,
      configurable: false,
      value: TextEncoder,
    });

    // await someSetupTasks(this.testPath);
    // this.global.someGlobalObject = createGlobalObject();

    // Will trigger if docblock contains @my-custom-pragma my-pragma-value
    // if (this.docblockPragmas["my-custom-pragma"] === "my-pragma-value") {
    //   // ...
    // }
  }

  async teardown() {
    // this.global.someGlobalObject = destroyGlobalObject();
    // await someTeardownTasks();
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }

  handleTestEvent = (
    event: Circus.SyncEvent | Circus.AsyncEvent,
    state: Circus.State
  ): void | Promise<void> => {
    if (event.name === "test_start") {
      // ...
    }
  };
}

export default CustomEnvironment;
// module.exports = CustomEnvironment;
