import { isPresentArray } from "@starbeam/core-utils";
import type {
  ChildType,
  DebugRuntime,
  DescriptionDetails,
  Nesting,
  ReactiveId,
  ReactiveType,
  Tagged,
} from "@starbeam/interfaces";
import { getID } from "@starbeam/shared";
import { getDescription } from "@starbeam/tags";

export type FullName = Flat | [Flat, ...ChildType[]];

export function describeTagged(tagged: Tagged): string {
  const description = getDescription(tagged)?.details;
  return description ? describe(description) : `{unknown reactive value}`;
}

export function describe(description: DescriptionDetails): string {
  return describeFullName(getFullName(description));
}

export function getFullName(description: DescriptionDetails): FullName {
  const base = getBase(description);

  if (base.type === "specified" || base.type === "anonymous") {
    return base;
  }

  let parent = base.parent;
  const path: Nesting[] = [base];

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const next = getBase(parent);

    if (next.type === "specified" || next.type === "anonymous") {
      return [next, ...path.reverse()];
    } else {
      path.push(next);
      parent = next.parent;
    }
  }
}

interface Specified {
  readonly type: "specified";
  readonly value: string;
}

interface Anonymous {
  readonly type: "anonymous";
  readonly id: ReactiveId;
  readonly kind: ReactiveType;
}

type Flat = Specified | Anonymous;

export function describeFullName(fullName: FullName): string {
  if (Array.isArray(fullName)) {
    const accum = [];

    for (const part of fullName) {
      switch (part.type) {
        case "specified":
        case "anonymous":
          accum.push(describeFlat(part));
          break;
        default:
          accum.push(describeNesting(part));
      }
    }

    return accum.join("");
  } else {
    return describeFlat(fullName);
  }
}

function describeFlat(fullName: Flat): string {
  if (fullName.type === "specified") {
    return fullName.value;
  } else {
    return `{anonymous ${fullName.kind}:${getIdString(fullName.id)}}`;
  }
}

function describeNesting(nesting: ChildType): string {
  switch (nesting.type) {
    case "property":
      return `.${nesting.value}`;
    case "index":
      return `[${nesting.value}]`;
    case "implementation":
      return `->{impl: ${nesting.value.name}}`;
    case "detail": {
      const { name, args } = nesting.value;

      return isPresentArray(args)
        ? `->${name}(${args.join(", ")})`
        : `->${name}`;
    }
    case "key": {
      const { name } = nesting.value;

      return `.get(${name})`;
    }
  }
}

function getBase(description: DescriptionDetails): Nesting | Flat {
  if (description.specified) {
    return { type: "specified", value: description.specified };
  } else if (description.nesting) {
    return description.nesting;
  } else {
    return { type: "anonymous", kind: description.type, id: description.id };
  }
}

function getIdString(id: ReactiveId, accum = "", nested = false): string {
  switch (typeof id) {
    case "string":
    case "number": {
      if (accum === "" || accum.endsWith("(")) {
        accum += String(id);
      } else if (accum.endsWith(")")) {
        accum += `->${id}`;
      } else {
        accum += `/${id}`;
      }
      break;
    }

    default: {
      if (accum !== "") accum += "->";
      if (nested) accum += "(";

      for (const part of id) {
        accum = getIdString(part, accum, true);
      }

      if (nested) accum += ")";
    }
  }

  return accum;
}

export const getUserFacing = (<D extends DescriptionDetails | undefined>(
  description: D
): D => {
  if (description?.nesting?.type === "implementation") {
    return getUserFacing(description.nesting.parent) as D;
  } else {
    return description;
  }
}) satisfies DebugRuntime["getUserFacing"];

if (import.meta.vitest) {
  const { test, expect, describe: group } = import.meta.vitest;

  test("getIdString", () => {
    expect(getIdString("myid")).toEqual("myid");
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers
    expect(getIdString(123)).toEqual("123");
    expect(getIdString(["a", "b", "c"])).toEqual("a/b/c");
    expect(getIdString(["a", ["b", "c"], "d"])).toEqual("a->(b/c)->d");
    expect(getIdString(["a", ["b", "c"], ["d", "e"]])).toEqual(
      "a->(b/c)->(d/e)"
    );
    expect(
      getIdString([
        ["a", "b"],
        ["c", "d"],
      ])
    ).toEqual("(a/b)->(c/d)");
    expect(getIdString(["a", ["b", "c"], ["d", "e"], "f"])).toEqual(
      "a->(b/c)->(d/e)->f"
    );
    expect(getIdString(["a", ["b", "c"], ["d", "e"], ["f", "g"]])).toEqual(
      "a->(b/c)->(d/e)->(f/g)"
    );
    // multiple levels of nesting
    expect(getIdString(["a", ["b", ["c", "d"], "e"], "f"])).toEqual(
      "a->(b->(c/d)->e)->f"
    );
  });

  test("getUserFacing", () => {
    const parentId = getID();
    const childId = getID();

    const parent = {
      type: "cell",
      caller: undefined,
      id: parentId,
      specified: "mycell",
    } satisfies DescriptionDetails;

    const child = {
      type: "cell",
      caller: undefined,
      id: childId,
      nesting: {
        type: "implementation",
        parent,
        value: { name: "initialized?", reason: "the cell was initialized" },
      },
    } satisfies DescriptionDetails;

    expect(getUserFacing(child)).toEqual(parent);
    expect(getUserFacing(parent)).toEqual(parent);
  });

  test("describeFlat", () => {
    expect(describeFlat({ type: "specified", value: "mycell" })).toEqual(
      "mycell"
    );
    const id = getID();
    expect(
      describeFlat({
        type: "anonymous",
        kind: "cell",
        id,
      })
    ).toEqual(`{anonymous cell:${id}}`);
  });

  test("describeFullName", () => {
    expect(describeFullName({ type: "specified", value: "mycell" })).toEqual(
      "mycell"
    );
    const id = getID();
    expect(
      describeFullName({
        type: "anonymous",
        kind: "cell",
        id,
      })
    ).toEqual(`{anonymous cell:${id}}`);

    const parentId = getID();
    const childId = getID();

    const parent = {
      type: "cell",
      caller: undefined,
      id: parentId,
      specified: "mycell",
    } satisfies DescriptionDetails;

    const child = {
      type: "cell",
      caller: undefined,
      id: childId,
      nesting: {
        type: "implementation",
        parent,
        value: {
          name: "initialized?",
          reason: "the cell was initialized",
        },
      },
    } satisfies DescriptionDetails;

    expect(describeFullName(getFullName(child))).toEqual(
      "mycell->{impl: initialized?}"
    );
    expect(
      describeFullName([
        { type: "specified", value: "mycell" },
        { type: "implementation", value: { name: "initialized?", reason: "" } },
      ])
    ).toEqual("mycell->{impl: initialized?}");

    const specified = {
      type: "specified",
      value: "mycell",
    } satisfies Specified;

    const anonymous = {
      type: "anonymous",
      kind: "cell",
      id: 1,
    } satisfies Anonymous;

    expect(describeFullName([anonymous, { type: "index", value: 2 }])).toEqual(
      "{anonymous cell:1}[2]"
    );
    expect(describeFullName([specified, { type: "index", value: 2 }])).toEqual(
      "mycell[2]"
    );

    expect(
      describeFullName([
        anonymous,
        { type: "key", value: { name: "foo", key: {} } },
      ])
    ).toEqual("{anonymous cell:1}.get(foo)");

    expect(
      describeFullName([
        specified,
        { type: "key", value: { name: "foo", key: {} } },
      ])
    ).toEqual("mycell.get(foo)");

    expect(
      describeFullName([anonymous, { type: "property", value: "foo" }])
    ).toEqual("{anonymous cell:1}.foo");

    expect(
      describeFullName([specified, { type: "property", value: "foo" }])
    ).toEqual("mycell.foo");
  });

  group("getFullName", () => {
    test("anonymous", () => {
      const id = getID();
      const description = {
        type: "cell",
        caller: undefined,
        id,
      } satisfies DescriptionDetails;

      expect(getFullName(description)).toEqual({
        type: "anonymous",
        kind: "cell",
        id,
      } satisfies Anonymous);
    });

    test("specified", () => {
      const description = {
        type: "cell",
        caller: undefined,
        id: getID(),
        specified: "mycell",
      } satisfies DescriptionDetails;

      expect(getFullName(description)).toEqual({
        type: "specified",
        value: "mycell",
      } satisfies Specified);
    });

    test("nested", () => {
      const parentId = getID();
      const childId = getID();

      const parent = {
        type: "collection",
        caller: undefined,
        id: parentId,
        specified: "mymap",
      } satisfies DescriptionDetails;

      const child = {
        type: "collection:item",
        caller: undefined,
        id: childId,
        nesting: {
          type: "key",
          parent,
          value: { name: "foo", key: "foo" },
        } satisfies Extract<Nesting, { type: "key" }>,
      } satisfies DescriptionDetails;

      expect(getFullName(child)).toEqual([
        {
          type: "specified",
          value: "mymap",
        } satisfies Specified,
        {
          type: "key",
          parent,
          value: { name: "foo", key: "foo" },
        } satisfies Nesting,
      ]);
    });
  });
}
