import { type Description, descriptionFrom } from "@starbeam/debug";
import { UNINITIALIZED } from "@starbeam/peer";
import { LIFETIME } from "@starbeam/timeline";
import { isNotEqual, verified } from "@starbeam/verify";

import { type Equality, Cell } from "../cell.js";
import { Formula } from "../formula/formula.js";
import { Linkable } from "../formula/linkable.js";
import type { CreateResource, Resource } from "../formula/resource.js";

interface MappedResourceOptions<T, U> {
  equals?: Equality<T>;
  fn: (value: T) => CreateResource<U>;
}

interface CreateResourceFn<T, U> {
  create: (options: { owner: object }) => (value: T) => U;
}

export function ResourceFn<T, U>(
  options: MappedResourceOptions<T, U>,
  description?: string | Description
): CreateResourceFn<T, U> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return Linkable.create((owner) => {
    const equals = options.equals ?? Object.is;

    const cell = Cell<T | UNINITIALIZED>(UNINITIALIZED, {
      description: descriptionFrom({
        type: "resource",
        api: { package: "@starbeam/core", name: "ResourceFn" },
        fromUser: description,
      }),
      equals: (a: T | UNINITIALIZED, b: T | UNINITIALIZED) => {
        if (a === UNINITIALIZED || b === UNINITIALIZED) {
          return false;
        }

        return equals(a, b);
      },
    });

    const formula = Formula(() => {
      const value = verified(cell.current, isNotEqual(UNINITIALIZED));
      return options.fn(value);
    });

    let last: { linkable: CreateResource<U>; resource: Resource<U> };

    return (value: T) => {
      cell.set(value);

      const next = formula.current;

      if (last === undefined) {
        last = { linkable: next, resource: next.create({ owner }) };
      } else if (last.linkable !== next) {
        LIFETIME.finalize(last.resource);
        last = { linkable: next, resource: next.create({ owner }) };
      }

      return last.resource.current;
    };
  });
}
