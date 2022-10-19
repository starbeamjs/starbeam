import { type Printable, Style, StyleInstance } from "../log.js";
import {
  type StyleName,
  type StylePartName,
  StylePart,
  STYLES,
} from "./styles.js";

type ToFragmentFn = ((message: Printable) => string) & {
  inverse: (message: Printable) => string;
};
type ParentToFragmentFn = ToFragmentFn & {
  [P in StyleName]: ToFragmentFn & {
    [Q in StylePartName]: ToFragmentFn;
  };
};

function FancyHeaderFn(style: Style, message: Printable): string {
  return createFancyHeader(["»", "«"], style, message);
}

FancyHeaderFn.wrapped = (
  start: string,
  end?: string | null
): ((style: Style, message: string) => string) => {
  if (end === undefined) {
    if (start.trim() === "") {
      end = start;
    } else {
      [start, end = start] = start.split(" ");
    }
  }

  const wrapper = [start, end] as const;

  return (style, message) => createFancyHeader(wrapper, style, message);
};

function createFancyHeader(
  [start, end]: readonly [start: string, end: string | null],
  style: Style,
  message: Printable
): string {
  const resolved = StyleInstance.resolve(style);

  let body = resolved(start) + " " + resolved.inverse(message);

  if (end !== null) {
    body += " " + resolved(end);
  }

  return body;
}

for (const [name, style] of Object.entries(STYLES) as [StyleName, Style][]) {
  const UpdateFn = FancyHeaderFn as typeof FancyHeaderFn &
    Record<string, ToFragmentFn>;

  const Fn = (message: Printable) => FancyHeaderFn(style, message);
  Fn.inverse = (message: Printable) => UpdateFn(Style.inverse(style), message);

  UpdateFn[name] = Fn;

  for (const part of StylePart.members) {
    const SubFrag = UpdateFn[name] as unknown as Record<string, ToFragmentFn>;
    const Fn = (message: Printable) => UpdateFn(`${name}:${part}`, message);
    Fn.inverse = (message: Printable) => UpdateFn(`${name}:${part}`, message);

    SubFrag[part] = Fn;
  }
}

export const FancyHeader = FancyHeaderFn as typeof FancyHeaderFn &
  ParentToFragmentFn;
