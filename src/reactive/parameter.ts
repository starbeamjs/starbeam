import { AnyReactiveChoice, ReactiveChoice } from "./choice";
import { AnyReactive, Reactive } from "./core";
import { AnyReactiveRecord, ReactiveRecord } from "./record";

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
