import { getLast, removeItem } from "@starbeam/core-utils";
import type { Unsubscribe } from "@starbeam/timeline";

const FIRST_ID = 0;

export class Channel {
  static #active: Channel[] = [];
  static #nextId = FIRST_ID;

  static reset(this: void): void {
    Channel.#active = [];
  }

  static subscribe(name: string): Channel {
    const channel = new Channel(Channel.#nextId++, name);
    Channel.#active.push(channel);
    return channel;
  }

  static latest(): Channel | undefined {
    return getLast(Channel.#active);
  }

  static sendMessage(channel: Channel, message: string): void {
    if (channel.isActive) {
      for (const subscriber of channel.#onMessage) {
        subscriber(message);
      }
    }
  }

  #id: number;
  #name: string;
  #onMessage = new Set<(message: string) => void>();

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
    return Channel.#active.includes(this);
  }

  onMessage(callback: (message: string) => void): Unsubscribe {
    this.#onMessage.add(callback);

    return () => {
      this.#onMessage.delete(callback);
    };
  }

  cleanup(): void {
    removeItem(Channel.#active, this);
  }
}
