import { ReactiveMetadata } from "../core/metadata.js";
import { describeValue } from "../describe.js";
import { ExtendsReactive } from "./base.js";
import { REACTIVE_BRAND } from "./internal.js";

export class Static<T> extends ExtendsReactive<T> {
  constructor(
    readonly current: T,
    readonly description = `a static ${describeValue(current)}`
  ) {
    super({
      name: "Static",
      description,
    });
    REACTIVE_BRAND.brand(this);
  }

  readonly metadata = ReactiveMetadata.Constant;
  readonly cells = [];
}
