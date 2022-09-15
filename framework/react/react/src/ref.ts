import type { anydom, browser } from "@domtree/flavors";
import { type Description, descriptionFrom } from "@starbeam/debug";
import { ElementPlaceholder } from "@starbeam/modifier";
import {
  expected,
  isEqual,
  isPresent,
  verified,
  verify,
} from "@starbeam/verify";

const REFS = new WeakMap<object, ElementPlaceholder<browser.Element>>();

export function getPlaceholder<E extends browser.Element>(
  ref: ElementRef<E>
): ElementPlaceholder<E> {
  return verified(
    REFS.get(ref),
    isPresent,
    expected(`a Starbeam ref's element`)
      .toBe(`present`)
      .when(`accessed from the internals of a Starbeam hook`)
  ) as unknown as ElementPlaceholder<E>;
}

const REF = Symbol("REF");
type REF = typeof REF;

interface InternalElementRef<_E extends browser.Element = browser.Element> {
  (element: browser.Element): void;
  [REF]: true;
}

export interface ReactElementRef<E extends browser.Element = browser.Element> {
  (element: E): void;
  readonly [REF]: E;
}

export interface ElementRef<E extends browser.Element = browser.Element> {
  readonly [REF]: E;
}

function ClassVerifier<E extends browser.Element>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Class: abstract new (...args: any[]) => E
): (element: browser.Element) => element is E {
  function verify(element: browser.Element): element is E {
    return element instanceof Class;
  }

  return expected.associate(
    verify,
    expected(`element provided by React`)
      .toBe(`an instance of ${Class.name}`)
      .when(`receiving an element from React's ref={} attribute`)
      .butGot((element: browser.Element) => element.constructor.name)
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ElementType<E extends anydom.Element> = abstract new (...args: any[]) => E;

export function ref<E extends browser.Element>(
  kind: ElementType<E>,
  description?: string | Description
): ReactElementRef<E> {
  const placeholder = ElementPlaceholder<E>(
    kind,
    descriptionFrom({
      type: "formula",
      api: {
        package: "@starbeam/react",
        name: "ref",
      },
      fromUser: description,
    })
  );
  const verifier = ClassVerifier<E>(kind);

  const refCallback = ((element: E | null) => {
    if (element !== null) {
      const el = verified(element, verifier);

      if (placeholder.current === null) {
        placeholder.initialize(el);
      } else {
        verify(
          placeholder.current,
          isEqual(el),
          expected
            .as(`an existing ref`)
            .toBe(`initialized with the same element`)
        );
      }
    }
  }) as InternalElementRef<E>;

  refCallback[REF] = true;

  REFS.set(
    refCallback,
    placeholder as unknown as ElementPlaceholder<browser.Element>
  );

  // eslint-disable-next-line
  return refCallback as any;
}
