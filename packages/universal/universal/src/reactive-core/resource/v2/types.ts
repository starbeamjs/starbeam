import type { CreateResourceRun } from "./run.js";

export type Cleanup<M> = (metadata: M) => void;
export type UpdateResource<T, M> = (
  run: CreateResourceRun<M>,
  metadata: M
) => T;
export type RunResult<T, M> = IteratorResult<
  Exposed<T, M>,
  ExposedFinalized<T, M>
>;
export { ResourceConstructor } from "./constructor.js";
export type Assimilate<T, U> = (value: T) => U;

export interface ExposedFinalized<T, M> {
  readonly instance: T;
  readonly metadata: M;
}

export interface Exposed<T, M> {
  readonly instance: T;
  readonly metadata: M;
}
