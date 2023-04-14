// @vitest-environment jsdom

import { Starbeam, useService } from "@starbeam/react";
import { Cell, Resource } from "@starbeam/universal";
import type { RenderState } from "@starbeam-workspace/react-test-utils";
import { html, react, testReact } from "@starbeam-workspace/react-test-utils";
import { beforeEach, describe, expect } from "@starbeam-workspace/test-utils";
import { createElement } from "react";

import { Channels } from "./support/channel.js";

const AUTH_CHANNELS = new Channels<Auth>();

describe("services", () => {
  beforeEach(AUTH_CHANNELS.reset);

  testReact<{ name: string }, Auth | null>("useService", async (root) => {
    const result = root
      .expectHTML((auth) =>
        auth
          ? `<img src="${auth.avatar}"><span>${auth.username}</span>`
          : `<p>loading</p>`
      )
      .render(
        (state) => {
          return createElement(
            Starbeam,
            null,
            react.render(Profile, {
              testState: state,
            })
          );
        },
        { name: "test" }
      );

    function Avatar(): React.ReactElement | null {
      const user = useService(CurrentUser);

      return user ? html.img({ src: user.avatar }) : null;
    }

    function Username(): React.ReactElement | null {
      const user = useService(CurrentUser);

      return user ? html.span(user.username) : null;
    }

    function Profile({
      testState,
    }: {
      testState: RenderState<Auth | null>;
    }): React.ReactElement {
      testState.rendered();
      const user = useService(CurrentUser);
      testState.value(user);

      if (user) {
        return react.fragment(react.render(Avatar), react.render(Username));
      } else {
        return html.p("loading");
      }
    }

    async function send(
      message: Auth,
      options: { expect: "active" | "inactive" } = { expect: "active" }
    ): Promise<void> {
      await result.act(() => {
        const latest = AUTH_CHANNELS.latest();

        if (latest === undefined) {
          expect(latest, "Channel.latest()").not.toBeUndefined();
          return;
        }

        AUTH_CHANNELS.sendMessage(latest, message);
      });

      expect(channel?.isActive, `the channel should be ${options.expect}`).toBe(
        options.expect === "active"
      );

      expect(result.value, "the last rendered auth value").toEqual({
        ...message,
      });
    }

    const channel = AUTH_CHANNELS.latest();
    expect(channel, "After rendering, the channel exists").not.toBeUndefined();

    expect(result.value).toBe(null);
    await send({ username: "elwayman02", avatar: "jordan.fake.png" });

    await result.rerender();

    await send({ username: "elwayman02", avatar: "jordan2.fake.png" });
    await send({ username: "elwayman02", avatar: "jordan3.fake.png" });

    // services should be cleaned up when the root component is unmounted
    result.unmount();
    expect(channel?.isActive).toBe(false);
  });
});

interface Auth {
  avatar: string;
  username: string;
}

const CurrentUser = Resource((r) => {
  const lastMessage = Cell(null as Auth | null, "last message");

  const c = AUTH_CHANNELS.subscribe("auth");

  c.onMessage((message) => {
    lastMessage.set(message);
  });

  r.on.cleanup(() => {
    c.cleanup();
  });

  return lastMessage;
}, "ChannelResource");
