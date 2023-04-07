import { getFirst, isObject } from "@starbeam/core-utils";
import type {
  Api,
  CallStack,
  DescriptionRuntime,
  ReactiveId,
} from "@starbeam/interfaces";
import type * as interfaces from "@starbeam/interfaces";
import { RUNTIME } from "@starbeam/reactive";
import { getID } from "@starbeam/shared";

export class Description implements interfaces.Description {
  readonly #details: interfaces.DescriptionDetails;

  constructor(desc: interfaces.DescriptionDetails) {
    this.#details = desc;
  }

  get details(): interfaces.DescriptionDetails {
    return this.#details;
  }

  get type(): interfaces.ReactiveType {
    return this.#details.type;
  }

  get caller(): CallStack | undefined {
    return this.#details.caller;
  }

  get frame(): interfaces.StackFrame | undefined {
    return getFirst(this.caller?.frames ?? []);
  }

  get id(): ReactiveId {
    return this.#details.id;
  }

  get isAnonymous(): boolean {
    return this.#details.specified === undefined;
  }

  index(index: number, caller?: CallStack | undefined): interfaces.Description {
    return new Description({
      type: "collection:item",
      id: this.#extendId(index),
      nesting: { type: "index", parent: this, value: index },
      caller: caller ?? this.#details.caller,
    });
  }

  property(
    name: string,
    caller?: CallStack | undefined
  ): interfaces.Description {
    return new Description({
      type: "collection:item",
      id: this.#extendId(name),
      nesting: { type: "property", parent: this, value: name },
      caller: caller ?? this.#details.caller,
    });
  }

  key(
    key: { name: string; key: unknown } | string | number,
    caller?: CallStack | undefined
  ): interfaces.Description {
    const value: { name: string; key: unknown } = isObject(key)
      ? { name: key.name, key: key.key }
      : { name: String(key), key };

    return new Description({
      type: "collection:item",
      id: this.#extendId(value.name),
      nesting: { type: "key", parent: this, value },
      caller: caller ?? this.#details.caller,
    });
  }

  detail(
    type: interfaces.ReactiveType,
    name: string,
    args: string[] | CallStack = [],
    caller?: CallStack | undefined
  ): interfaces.Description {
    const info = Array.isArray(args)
      ? { args, caller }
      : { args: [], caller: args };

    return new Description({
      type,
      id: this.#extendId(name),
      nesting: {
        type: "detail",
        parent: this,
        value: { name, args: info.args },
      },
      caller: info.caller ?? this.#details.caller,
    });
  }

  implementation(
    type: interfaces.ReactiveType,
    name: string,
    reason: string,
    caller?: CallStack | undefined
  ): interfaces.Description {
    return new Description({
      type,
      id: this.#extendId(name),
      nesting: {
        type: "implementation",
        parent: this,
        value: { name, reason },
      },
      caller: caller ?? this.#details.caller,
    });
  }

  #extendId(id: ReactiveId): ReactiveId {
    return Array.isArray(this.id) ? [...this.id, id] : [this.id, id];
  }
}

const DESC_FRAME = 1;

export const Desc = ((
  type: interfaces.ReactiveType,
  specified: string | interfaces.Description | undefined,
  api: string | Api | undefined
): interfaces.Description => {
  if (isObject(specified)) return specified;

  const caller = RUNTIME.callerStack?.(DESC_FRAME);
  api = api ?? caller?.frames[0].action;
  const id = getID();

  return new Description({
    type,
    id,
    api: typeof api === "string" ? { type: "simple", name: api, caller } : api,
    specified,
    caller,
  });
}) satisfies DescriptionRuntime;
