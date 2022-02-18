import type { AnyReactiveChoice } from "./choice.js";
import type { AnyReactive } from "./base.js";
import type { AnyReactiveRecord } from "./record.js";

export type ReactiveParameter =
  | AnyReactive
  | AnyReactiveRecord
  | AnyReactiveChoice;
