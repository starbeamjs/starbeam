import { isObject } from "../utils.js";
import { ExtendsReactive, type IntoReactive } from "./base.js";
import { Static } from "./static.js";

export const Reactive = {
  from<T>(reactive: IntoReactive<T>): Reactive<T> {
    if (Reactive.is(reactive)) {
      return reactive;
    } else {
      return new Static(reactive);
    }
  },

  is<T>(reactive: unknown | Reactive<T>): reactive is Reactive<T> {
    return isObject(reactive) && reactive instanceof ExtendsReactive;
  },
};

import type * as types from "../fundamental/types.js";

export type Reactive<T = unknown> = types.Reactive<T>;
