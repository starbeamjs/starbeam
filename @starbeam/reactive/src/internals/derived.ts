import type {
  DerivedInternals,
  FinalizedFrame,
  FrameChild,
  FrameValidation,
  InitializedDerivedInternals,
  MutableInternals,
  Timestamp,
  UninitializedDerivedInternals,
} from "@starbeam/timeline";
import { MutableInternalsImpl } from "./mutable.js";

type InferReturn = any;

export class UninitializedDerivedInternalsImpl
  implements UninitializedDerivedInternals
{
  static create<T>(
    description: string
  ): UninitializedDerivedInternalsImpl & DerivedInternals<T> {
    return new UninitializedDerivedInternalsImpl(
      description,
      MutableInternalsImpl.create(description)
    ) as InferReturn;
  }

  readonly type = "derived";
  readonly state = "uninitialized";

  readonly #description: string;
  readonly #initialized: MutableInternals;

  private constructor(description: string, initialized: MutableInternals) {
    this.#description = description;
    this.#initialized = initialized;
  }

  /** impl UninitializedDerivedInternals */
  readonly isInitialized: false = false;

  get description(): string {
    return this.#description;
  }

  get initialized(): MutableInternals {
    return this.#initialized;
  }

  dependencies(): readonly MutableInternals[] {
    return [this.#initialized];
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return this.#initialized.isUpdatedSince(timestamp);
  }

  initialize<T>(frame: FinalizedFrame<T>): InitializedDerivedInternals<T> {
    this.#initialized.freeze();
    return InitializedDerivedInternalsImpl.create(
      frame,
      this.#initialized,
      this.#description
    );
  }
}

export class InitializedDerivedInternalsImpl<T>
  implements InitializedDerivedInternals<T>
{
  static create<T>(
    frame: FinalizedFrame<T>,
    initialized: MutableInternals,
    description: string
  ): InitializedDerivedInternalsImpl<T> {
    return new InitializedDerivedInternalsImpl(frame, initialized, description);
  }

  readonly type = "derived";
  readonly state = "initialized";

  #frame: FinalizedFrame<T>;
  readonly #initialized: MutableInternals;
  readonly #description: string;

  private constructor(
    frame: FinalizedFrame<T>,
    initialized: MutableInternals,
    description: string
  ) {
    this.#frame = frame;
    this.#initialized = initialized;
    this.#description = description;
  }

  /** impl InitializedDerivedInternals */
  get initialized(): MutableInternals {
    return this.#initialized;
  }

  get frame(): FinalizedFrame<T> {
    return this.#frame;
  }

  children(): ReadonlySet<FrameChild> {
    return new Set([...this.#frame.children, this.#initialized]);
  }

  validate(): FrameValidation<T> {
    return this.#frame.validate();
  }

  update(frame: FinalizedFrame<T>): void {
    this.#frame = frame;
  }

  /** impl DerivedInternals */
  readonly isInitialized: true = true;

  get description(): string {
    return this.#description;
  }

  dependencies(): readonly MutableInternals[] {
    return [...this.#frame.dependencies, this.#initialized];
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return this.#frame.isUpdatedSince(timestamp);
  }
}
