export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
export type Unsubscribe = undefined | (() => void);

export interface Diff<T> {
  readonly add: Set<T>;
  readonly remove: Set<T>;
}
