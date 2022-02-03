import { HookBlueprint, HookValue, LOGGER, Reactive, tree } from "starbeam";
import { expect, test, toBe } from "../support";
import { value, when } from "../support/expect/expect";

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
  let user = universe.cell("@tomdale", "user");
  let channel = universe.cell("chat.today", "channel name");
  let tick = universe.cell(0, "tick");

  function Channel(
    channel: Reactive<string>,
    user: Reactive<string>
  ): HookBlueprint<string> {
    return universe.hook((hook) => {
      let subscription = new Subscription(channel.current);

      hook.onDestroy(() => subscription.destroy());

      return universe.memo(
        () => `${subscription.name} for ${user.current}`,
        `channel description`
      );
    }, "Channel");
  }

  let RootHook = universe.hook((hook) => {
    let description = hook.use(Channel(channel, user));

    return universe.memo(
      () => `[timestamp = ${tick.current}] ${description.current}`,
      `annotated channel description`
    );
  }, "RootHook");

  let output = HookValue.create<string>();

  LOGGER.trace.log("\n> building hook");
  let root = universe.use(RootHook, { into: output });

  LOGGER.trace.log("\n> initializing");
  root.initialize();

  LOGGER.trace.log("\n> polling");
  root.poll();

  LOGGER.trace.log("\n> reading output.current");
  expect(output.current, toBe("[timestamp = 0] chat.today for @tomdale"));

  let subscription = Subscription.last();
  expect(subscription.destroyed, toBe(0));

  user.update("@todale");
  root.poll();

  expect(
    output.current,
    toBe("[timestamp = 0] chat.today for @todale").when("after updating user")
  );
  expect(subscription.destroyed, toBe(0));

  tick.update(1);
  root.poll();

  expect(output.current, toBe("[timestamp = 1] chat.today for @todale"));
  expect(subscription.destroyed, toBe(0));

  channel.update("chat.yesterday");
  root.poll();

  expect(output.current, toBe("[timestamp = 1] chat.yesterday for @todale"));
  expect(
    when(`after channel update`),
    value(subscription.destroyed).as(`subscription.destroyed`),
    toBe(1)
  );

  let subscription2 = Subscription.last();
  expect(subscription2.destroyed, toBe(0));

  channel.update("chat.tomorrow");
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
        universe.lifetime.debug.map((o) => o.tree())
      )
    ).stringify()
  );

  universe.finalize(root);
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
