import {
  UNINITIALIZED_REACTIVE,
  type DerivedInternals,
  type FinalizedFrame,
  type FrameChild,
  type FrameValidation,
  type InitializedDerivedInternals,
  type MutableInternals,
  type Timestamp,
  type UninitializedDerivedInternals,
} from "@starbeam/timeline";

type InferReturn = any;

export class UninitializedDerivedInternalsImpl
  implements UninitializedDerivedInternals
{
  static create<T>(
    description: string
  ): UninitializedDerivedInternalsImpl & DerivedInternals<T> {
    return new UninitializedDerivedInternalsImpl(description) as InferReturn;
  }

  readonly type = "derived";
  readonly state = "uninitialized";

  readonly #description: string;

  private constructor(description: string) {
    this.#description = description;
  }

  /** impl UninitializedDerivedInternals */
  readonly isInitialized: false = false;

  get description(): string {
    return this.#description;
  }

  dependencies(): UNINITIALIZED_REACTIVE {
    return UNINITIALIZED_REACTIVE;
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return false;
  }

  initialize<T>(frame: FinalizedFrame<T>): InitializedDerivedInternals<T> {
    return InitializedDerivedInternalsImpl.create(frame, this.#description);
  }
}

export class InitializedDerivedInternalsImpl<T>
  implements InitializedDerivedInternals<T>
{
  static create<T>(
    frame: FinalizedFrame<T>,
    description: string
  ): InitializedDerivedInternalsImpl<T> {
    return new InitializedDerivedInternalsImpl(frame, description);
  }

  readonly type = "derived";
  readonly state = "initialized";

  #frame: FinalizedFrame<T>;
  readonly #description: string;

  private constructor(frame: FinalizedFrame<T>, description: string) {
    this.#frame = frame;
    this.#description = description;
  }

  /** impl InitializedDerivedInternals */
  get frame(): FinalizedFrame<T> {
    return this.#frame;
  }

  children(): ReadonlySet<FrameChild> {
    return this.#frame.children;
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
    return this.#frame.dependencies;
  }

  isUpdatedSince(timestamp: Timestamp): boolean {
    return this.#frame.isUpdatedSince(timestamp);
  }
}
