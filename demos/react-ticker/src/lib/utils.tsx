import { useReactive } from "@starbeam/react";

export function When<T>({
  value,
  render,
  else: otherwise = () => null,
}: {
  value: T | null | undefined | false | "";
  render: (item: T) => JSX.Element;
  else?: () => JSX.Element | null;
}) {
  if (value) {
    return useReactive(() => render(value));
  } else {
    return otherwise();
  }
}

export function For<T>({
  each,
  render,
}: {
  each: T[];
  render: (item: T, index: number) => JSX.Element;
}) {
  return useReactive(() => <>{each.map(render)}</>);
}
