import { builtin } from "../reactive/builtins/reactive.js";
import { ReactiveCell } from "../reactive/cell.js";
import { ReactiveMemo } from "../reactive/memo.js";
import { verify } from "../strippable/assert.js";
import { is } from "../strippable/minimal.js";
import { expected } from "../strippable/verify-context.js";
export const reactive = (target, key) => {
    if (key === undefined) {
        return builtin(target);
    }
    let cell = ReactiveCell.create(undefined, `@reactive ${String(key)}`);
    return {
        enumerable: true,
        configurable: true,
        get: function () {
            return cell.current;
        },
        set: function (value) {
            cell.update(value);
        },
    };
};
export const cached = (_target, key, descriptor) => {
    const { get, enumerable, configurable } = descriptor;
    verify(get, is.Present, expected(`the target of @cached`)
        .toBe(`a getter`)
        .butGot(() => typeof descriptor.value === "function" ? `a method` : `a field`));
    const CACHED = new WeakMap();
    return {
        enumerable,
        configurable,
        get: function () {
            let memo = CACHED.get(this);
            if (!memo) {
                memo = ReactiveMemo.create(() => get.call(this), `computing ${String(key)}`);
                CACHED.set(this, memo);
            }
            return memo.current;
        },
    };
};
//# sourceMappingURL=reactive.js.map