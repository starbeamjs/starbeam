import { getFirst, isObject } from "@starbeam/core-utils";
import type {
  Api,
  CallStack,
  DescFn,
  Description as IDescription,
  DescriptionDetails,
  Nesting,
  ReactiveId,
  ReactiveType,
  StackFrame,
} from "@starbeam/interfaces";
import { DEBUG } from "@starbeam/reactive";
import { getID } from "@starbeam/shared";

export class Description implements IDescription {
  readonly #details: DescriptionDetails;

  constructor(desc: DescriptionDetails) {
    this.#details = desc;
  }

  get api(): Api | undefined {
    return this.#details.api;
  }

  get nesting(): Nesting | undefined {
    return this.#details.nesting;
  }

  get type(): ReactiveType {
    return this.#details.type;
  }

  get caller(): CallStack | undefined {
    return this.#details.caller;
  }

  get frame(): StackFrame | undefined {
    return getFirst(this.caller?.frames ?? []);
  }

  get id(): ReactiveId {
    return this.#details.id;
  }

  get isAnonymous(): boolean {
    return this.#details.specified === undefined;
  }

  index(index: number, caller?: CallStack | undefined): IDescription {
    return new Description({
      type: "collection:item",
      id: this.#extendId(index),
      nesting: { type: "index", parent: this, value: index },
      caller: caller ?? this.#details.caller,
    });
  }

  property(name: string, caller?: CallStack | undefined): IDescription {
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
  ): IDescription {
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
    type: ReactiveType,
    name: string,
    args: string[] | CallStack = [],
    caller?: CallStack | undefined
  ): IDescription {
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
    type: ReactiveType,
    name: string,
    reason: string,
    caller?: CallStack | undefined
  ): IDescription {
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
  type: ReactiveType,
  specified?: string | IDescription | undefined,
  api?: string | Api | undefined
): IDescription => {
  if (isObject(specified)) return specified;

  const caller = DEBUG?.callerStack(DESC_FRAME);
  api = api ?? getFirst(caller?.frames)?.action;
  const id = getID();

  const desc = new Description({
    type,
    id,
    api: typeof api === "string" ? { type: "simple", name: api, caller } : api,
    specified,
    caller,
  });
  return desc;
}) satisfies DescFn;
