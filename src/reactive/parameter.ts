import { ReactiveRecord } from ".";
import { AnyReactiveChoice, ReactiveChoice } from "./choice";
import { AnyReactive, Reactive } from "./core";
import type { AnyReactiveRecord } from "./record";

export type ReactiveParameter =
  | AnyReactive
  | AnyReactiveRecord
  | AnyReactiveChoice;

export const ReactiveParameter = {
  isStatic(parameter: ReactiveParameter): boolean {
    if (Reactive.is(parameter)) {
      return Reactive.isStatic(parameter);
    } else if (ReactiveRecord.is(parameter)) {
      return parameter.metadata.isStatic;
    } else {
      return ReactiveChoice.isStatic(parameter);
    }
  },
};
