import type { AnyReactiveChoice } from "./choice";
import type { AnyReactive } from "./core";
import type { AnyReactiveRecord } from "./record";

export type ReactiveParameter =
  | AnyReactive
  | AnyReactiveRecord
  | AnyReactiveChoice;
