import { UNINITIALIZED } from "@starbeam/fundamental";
import { LIFETIME } from "@starbeam/lifetime";
import { Memo } from "@starbeam/reactive";
import { Callbacks } from "./callbacks.js";
import type { PhasedBuilder } from "./linkable.js";

type EffectBlueprint = (effect: ReactiveEffect) => () => void;

class ReactiveEffect implements PhasedBuilder {
  static construct(blueprint: EffectBlueprint): ReactiveEffect {
    const effect = ReactiveEffect.create();
    effect.#memo = blueprint(effect);
    return effect;
  }

  static create(): ReactiveEffect {
    const effect = new ReactiveEffect(null, Callbacks.create());

    LIFETIME.on.finalize(effect, () => effect.#teardown.invoke());

    return effect;
  }

  #memo: Memo<void> | null;
  readonly #teardown: Callbacks;

  private constructor(memo: Memo<void> | null, teardown: Callbacks) {
    this.#memo = memo;
    this.#teardown = teardown;
  }

  get memo() {}
}

function format(options: Intl.RelativeTimeFormatOptions) {
  const format = new Intl.RelativeTimeFormat(undefined, options);
}

export function Effect<T>(blueprint: (effect: ReactiveEffect) => () => void) {
  const effect = ReactiveEffect.create();
  const attach = blueprint();

  let last: T | UNINITIALIZED = UNINITIALIZED;

  const finalizer = () => {
    if (last !== UNINITIALIZED) {
      LIFETIME.finalize(last);
    }
  };

  const memo = Memo(() => {
    finalizer();
    last = attach();
  });

  return {
    value: undefined,
    finalize: Finalizer(finalizer),
    memo,
  };
}
