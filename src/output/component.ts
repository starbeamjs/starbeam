import type { DomTypes } from "../dom/types";
import type { ReactiveParameter } from "../reactive/parameter";
import type { Output } from "./output";

export type Component<P extends ReactiveParameter, T extends DomTypes> = (
  arg: P
) => Output<T>;
