import { getLast, removeItem } from "@starbeam/core-utils";
import type { Unsubscribe } from "@starbeam/runtime";

const FIRST_ID = 0;

export class Channels<Message = string> {
  readonly reset = Channel.reset;

  readonly subscribe = (name: string): Channel<Message> =>
    Channel.subscribe(name);

  readonly latest = (): Channel<Message> | undefined => {
    return Channel.latest() as Channel<Message> | undefined;
  };

  readonly sendMessage = (
    channel: Channel<Message>,
    message: Message
  ): void => {
    if (channel.isActive) {
      Channel.sendMessage(channel, message);
    }
  };
}

export class Channel<Message = string> {
  static #active: Channel[] = [];
  static #nextId = FIRST_ID;

  static reset(this: void): void {
    Channel.#active = [];
  }

  static subscribe<Message>(name: string): Channel<Message> {
    const channel = new Channel<Message>(Channel.#nextId++, name);
    Channel.#active.push(channel as unknown as Channel);
    return channel;
  }

  static latest(): Channel | undefined {
    return getLast(Channel.#active);
  }

  static sendMessage<Message>(
    channel: Channel<Message>,
    message: Message
  ): void {
    if (channel.isActive) {
      for (const subscriber of channel.#onMessage) {
        subscriber(message);
      }
    }
  }

  #id: number;
  #name: string;
  #onMessage = new Set<(message: Message) => void>();

  constructor(id: number, name: string) {
    this.#id = id;
    this.#name = name;
  }

  get id(): number {
    return this.#id;
  }

  get name(): string {
    return this.#name;
  }

  get isActive(): boolean {
    return Channel.#active.includes(this as unknown as Channel);
  }

  onMessage(callback: (message: Message) => void): Unsubscribe {
    this.#onMessage.add(callback);

    return () => {
      this.#onMessage.delete(callback);
    };
  }

  cleanup(): void {
    removeItem(Channel.#active, this as unknown as Channel);
  }
}
