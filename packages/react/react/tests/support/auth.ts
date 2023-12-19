import type { IntoResourceBlueprint } from "@starbeam/universal";
import { Cell, Resource } from "@starbeam/universal";
import type {
  RenderResult,
  RenderState,
} from "@starbeam-workspace/react-test-utils";
import { html, react } from "@starbeam-workspace/react-test-utils";
import { expect } from "@starbeam-workspace/test-utils";
import type React from "react";

import type { Channel } from "./channel.js";
import { Channels } from "./channel.js";

type SendFn = (
  message: Auth,
  options?: { expect: "active" | "inactive" },
) => Promise<void>;

export function testAuth(
  getService: <T>(blueprint: IntoResourceBlueprint<T>) => T,
): {
  Avatar: () => React.ReactElement | null;
  Username: () => React.ReactElement | null;
  Profile: (options: {
    testState: RenderState<Auth | null>;
  }) => React.ReactElement;
  currentChannel: () => Channel<Auth> | undefined;
  rendered: <T, U>(result: RenderResult<T, U>) => { send: SendFn };
} {
  return {
    Avatar,
    Profile,
    Username,
    currentChannel: AUTH_CHANNELS.latest,
    rendered: (result) => {
      const channel = AUTH_CHANNELS.latest();

      return { send };

      async function send(
        message: Auth,
        options: { expect: "active" | "inactive" } = { expect: "active" },
      ): Promise<void> {
        await result.act(() => {
          const latest = AUTH_CHANNELS.latest();

          if (latest === undefined) {
            expect(latest, "Channel.latest()").not.toBeUndefined();
            return;
          }

          AUTH_CHANNELS.sendMessage(latest, message);
        });

        expect(
          channel?.isActive,
          `the channel should be ${options.expect}`,
        ).toBe(options.expect === "active");

        expect(result.value, "the last rendered auth value").toEqual({
          ...message,
        });
      }
    },
  };

  function Avatar(): React.ReactElement | null {
    const user = getService(CurrentUser).current;

    return user ? html.img({ src: user.avatar }) : null;
  }

  function Username(): React.ReactElement | null {
    const user = getService(CurrentUser).current;

    return user ? html.span(user.username) : null;
  }

  function Profile({
    testState,
  }: {
    testState: RenderState<Auth | null>;
  }): React.ReactElement {
    testState.rendered();
    const user = getService(CurrentUser).current;
    testState.value(user);

    if (user) {
      return react.fragment(react.render(Avatar), react.render(Username));
    } else {
      return html.p("loading");
    }
  }
}

interface Auth {
  avatar: string;
  username: string;
}

const AUTH_CHANNELS = new Channels<Auth>();

const CurrentUser = Resource((r) => {
  const lastMessage = Cell(null as Auth | null, "last message");

  r.on.sync(() => {
    const c = AUTH_CHANNELS.subscribe("auth");

    c.onMessage((message) => lastMessage.set(message));

    return () => void c.cleanup();
  });

  return lastMessage;
}, "ChannelResource");
