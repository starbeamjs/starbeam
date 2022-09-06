export interface Diff<T> {
  readonly add: Set<T>;
  readonly remove: Set<T>;
}
