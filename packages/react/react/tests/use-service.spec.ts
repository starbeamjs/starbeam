// @vitest-environment jsdom

import { setupReactive, useReactive, useService } from "@starbeam/react";
import {
  Cell,
  type IntoResourceBlueprint,
  Resource,
} from "@starbeam/universal";
import {
  html,
  react,
  type SetupTestRender,
  testReact,
} from "@starbeam-workspace/react-test-utils";
import { beforeEach, describe, expect } from "@starbeam-workspace/test-utils";

import { testAuth } from "./support/auth.js";
import { Channels } from "./support/channel.js";
import { usingStarbeam } from "./use-setup.spec.js";

const AUTH_CHANNELS = new Channels<Auth>();

describe("services", () => {
  beforeEach(AUTH_CHANNELS.reset);

  testReact<{ name: string }, Auth | null>("useService", async (root) => {
    await testService(root, (blueprint) => useService(blueprint));
  });

  testReact<{ name: string }, Auth | null>(
    "service in useReactive",
    async (root) => {
      await testService(root, (blueprint) =>
        useReactive(({ service }) => service(blueprint), [])
      );
    }
  );

  testReact<{ name: string }, Auth | null>(
    "service in setupReactive",
    async (root) => {
      await testService(root, (blueprint) => {
        const reactive = setupReactive(({ service }) => service(blueprint));
        return useReactive(() => reactive.current, [reactive]);
      });
    }
  );

  testReact<void, number>("simple useService", async (root) => {
    const result = root
      .expectHTML((count) => `<span>${count}</span><button>++</button>`)
      .render((state) => {
        return usingStarbeam(() => {
          const instance = useService(CountResource);

          return useReactive(() => {
            state.value(instance.current);
            return react.fragment(
              html.span(instance.current),
              html.button({ onClick: () => instance.increment() }, "++")
            );
          }, []);
        });
      });

    await result.find("button").fire.click();

    expect(result.value).toBe(1);
  });
});

const CountResource = Resource(({ on }) => {
  const counter = Cell(0);
  let isActive = true;

  on.cleanup(() => (isActive = false));

  return {
    get isActive() {
      return isActive;
    },

    get current() {
      return counter.current;
    },
    increment: () => counter.current++,
  };
});

async function testService(
  root: SetupTestRender<
    {
      name: string;
    },
    Auth | null
  >,
  getService: <T>(blueprint: IntoResourceBlueprint<T>) => T
): Promise<void> {
  const { Profile, rendered, currentChannel } = testAuth(getService);

  const result = root
    .expectHTML((auth) =>
      auth
        ? `<img src="${auth.avatar}"><span>${auth.username}</span>`
        : `<p>loading</p>`
    )
    .render((state) => usingStarbeam(Profile, { testState: state }), {
      name: "test",
    });

  const { send } = rendered(result);

  const originalChannel = currentChannel();
  expect(
    currentChannel(),
    "After rendering, the channel exists"
  ).not.toBeUndefined();

  expect(result.value).toBe(null);
  await send({ username: "elwayman02", avatar: "jordan.fake.png" });

  await result.rerender();

  await send({ username: "elwayman02", avatar: "jordan2.fake.png" });
  await send({ username: "elwayman02", avatar: "jordan3.fake.png" });

  // services should be cleaned up when the root component is unmounted
  result.unmount();
  expect(originalChannel?.isActive).toBe(false);
}

interface Auth {
  avatar: string;
  username: string;
}
