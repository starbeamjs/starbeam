import type { Reactive } from "@starbeam/reactive";

export type IntoReactive<T> = Reactive<T> | T;
