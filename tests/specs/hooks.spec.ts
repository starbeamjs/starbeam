import { config, Priority } from "@starbeam/config";
import { Hook, HookBlueprint, HookValue, lifetime } from "@starbeam/core";
import { tree } from "@starbeam/debug";
import { Cell, Memo, Reactive } from "@starbeam/reactive";
import { REACTIVE } from "@starbeam/timeline";
import { LOGGER } from "@starbeam/trace-internals";
import { value, when } from "../support/expect/expect.js";
import { expect, test, toBe } from "../support/index.js";

class Subscription {
  static #all: Subscription[] = [];

  static get all(): readonly Subscription[] {
    return [...Subscription.#all];
  }

  static last(): Subscription {
    if (Subscription.#all.length === 0) {
      throw Error(
        `Don't access last test Subscription before rendering the hook`
      );
    }

    return Subscription.#all[Subscription.#all.length - 1];
  }

  #destroyed = 0;

  constructor(readonly name: string) {
    Subscription.#all.push(this);
  }

  destroy() {
    this.#destroyed++;
  }

  get isDestroyed(): boolean {
    return this.#destroyed > 0;
  }

  get destroyed(): number {
    return this.#destroyed;
  }
}

test("universe.hook.values", ({ universe }) => {
  config().set("DefaultPriority", Priority.Inline);

  const user = Cell("@tomdale", "user");
  const channel = Cell("chat.today", "channel name");
  const tick = Cell(0, "tick");

  function Channel(
    channel: Reactive<string>,
    user: Reactive<string>
  ): HookBlueprint<string> {
    return Hook((hook) => {
      const subscription = new Subscription(channel.current);

      hook.onDestroy(() => subscription.destroy());

      return Memo(
        () => `${subscription.name} for ${user.current}`,
        `channel description`
      );
    }, "Channel");
  }

  const RootHook = Hook((hook) => {
    const description = hook.use(Channel(channel, user));

    return Memo(() => {
      debugger;
      description.current;

      return `[timestamp = ${tick.current}] ${description.current}`;
    }, `annotated channel description`);
  }, "RootHook");

  const output = HookValue.create<string>();

  LOGGER.trace.log("\n> building hook");
  const root = universe.use(RootHook, { into: output });

  const rootReactive = root[REACTIVE];

  LOGGER.trace.log("\n> initializing");
  root.initialize();

  LOGGER.trace.log("\n> polling");
  root.poll();

  Reactive.getDependencies(root);

  LOGGER.trace.log("\n> reading output.current");
  expect(output.current, toBe("[timestamp = 0] chat.today for @tomdale"));

  let subscription = Subscription.last();
  expect(subscription.destroyed, toBe(0));

  user.current = "@todale";
  root.poll();

  expect(
    output.current,
    toBe("[timestamp = 0] chat.today for @todale").when("after updating user")
  );
  expect(subscription.destroyed, toBe(0));

  tick.current = 1;
  root.poll();

  expect(output.current, toBe("[timestamp = 1] chat.today for @todale"));
  expect(subscription.destroyed, toBe(0));

  channel.current = "chat.yesterday";
  root.poll();

  expect(output.current, toBe("[timestamp = 1] chat.yesterday for @todale"));
  expect(
    when(`after channel update`),
    value(subscription.destroyed).as(`subscription.destroyed`),
    toBe(1)
  );

  let subscription2 = Subscription.last();
  expect(subscription2.destroyed, toBe(0));

  channel.current = "chat.tomorrow";
  root.poll();

  expect(output.current, toBe("[timestamp = 1] chat.tomorrow for @todale"));
  expect(
    when(`after channel update`),
    value(subscription2.destroyed).as(`subscription2.destroyed`),
    toBe(1)
  );

  let subscription3 = Subscription.last();
  expect(subscription3.destroyed, toBe(0));

  console.log(
    tree((b) =>
      b.list(
        "roots",
        lifetime.debug(root).map((o) => o.tree())
      )
    ).stringify()
  );

  lifetime.finalize(root);
  expect(
    when(`after root finalization`),
    value(subscription2.destroyed).as("second subscription destroy count"),
    toBe(1)
  );

  // TODO: formatting

  // expect(0 /* second subscription destroy count */, toBe(1))
  //
  // Expected [second subscription destroy count] to be: [[1]]
  // But got: [[0]]
});
