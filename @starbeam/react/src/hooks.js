import { assert, Enum, HookBlueprint, HookValue, is, lifetime, RenderedRoot, verified, } from "@starbeam/core";
import { useContext, useLayoutEffect } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import { STARBEAM } from "./provider.js";
console.log("from starbeam");
const REFS = new WeakMap();
const REF = Symbol("REF");
export function ref(kind) {
    return function setElement(element) {
        assert(element instanceof kind, `Expected ref's element to be a ${kind.name}, but got a ${element.constructor.name}`);
        REFS.set(setElement, element);
    };
}
const LAYOUT_VALUES = new WeakMap();
class Layout extends Enum("Rendering", "Rendered(T)") {
    map(callback) {
        return this.match({
            Rendering: () => Layout.Rendering(),
            Rendered: (value) => Layout.Rendered(callback(value)),
        });
    }
    get rendered() {
        let values = LAYOUT_VALUES.get(this);
        let promise;
        if (values) {
            promise = values.promise;
        }
        else {
            let fulfill;
            promise = new Promise((f) => {
                fulfill = f;
            });
            LAYOUT_VALUES.set(this, { promise, fulfill });
        }
        throw promise;
    }
}
export function useModifier(ref, hook) {
    let layout = Layout.Rendering();
    let value = HookValue.create();
    let root;
    const starbeam = useContext(STARBEAM);
    useLayoutEffect(() => {
        const element = verified(REFS.get(ref), is.Present);
        let initializedRoot = (root = starbeam.use(hook(element), { into: value }));
        layout = Layout.Rendered(value.current);
        return () => lifetime.finalize(initializedRoot);
    }, []);
    return useSyncExternalStore((notifyReact) => {
        // TODO: value.current might be undefined here; try to clean up the types for this use-case
        let last = value.current;
        let teardown = starbeam.on.advance(() => {
            if (!root) {
                return;
            }
            root.poll();
            let current = value.current;
            if (last !== current) {
                last = current;
                layout = Layout.Rendered(current);
                notifyReact();
            }
        });
        return teardown;
    }, () => layout);
}
// let i = 0;
// export function useAtom<T>(value: T, description = "(anonymous atom)") {
//   const starbeam = useContext(STARBEAM);
//   const update = (value: T) => {
//     const { cell } = reactive;
//     if (cell === null) {
//       console.warn(`Attempting to update a cell that wasn't initialized`);
//     } else {
//       cell.update(value);
//     }
//   };
//   const reactive: { cell: Cell<T> | null } = {
//     cell: null,
//   };
//   let last: { current: T; update: (value: T) => void } = {
//     current: value,
//     update,
//   };
//   return useSyncExternalStore(
//     useCallback((notifyReact) => {
//       i++;
//       console.log(`running uSES callback (#${i}: ${description})`);
//       if (reactive.cell === null) {
//         console.log(`initialized with ${value}`);
//         reactive.cell = cell(value);
//         Object.freeze(reactive);
//       } else {
//         console.log(`already initialized (value = ${value})`);
//       }
//       let teardown = starbeam.on.advance(() => {
//         console.log(`#${i}: on advance callback is running`);
//         const { cell } = reactive;
//         if (cell === null) {
//           console.log(`Cell wasn't yet initialized. Nothing to do`);
//           return;
//         }
//         let current = cell.current;
//         console.log(`#${i}: values`, {
//           last,
//           current,
//           same: last.current === current,
//         });
//         if (last.current !== current) {
//           console.log(`Notifying React`);
//           last = {
//             current,
//             update,
//           };
//           notifyReact();
//         }
//       });
//       return teardown;
//     }, []),
//     () => {
//       console.trace(`${i}: Retrieving snapshot (${last.current})`);
//       return last;
//     }
//   );
// }
export function use(hook) {
    // const value: HookValue<T> = HookValue.create();
    // const starbeam = useContext(STARBEAM);
    // const root = starbeam.use(hook, { into: value });
    const value = hook.asData();
    let last = value.current;
    const starbeam = useContext(STARBEAM);
    console.log(`use ${hook.description} is running`);
    return useSyncExternalStore((notifyReact) => {
        let teardown = starbeam.on.advance(() => {
            let current = value.current;
            console.log(`on advance callback is running`, {
                last,
                current,
                same: last === current,
            });
            if (last !== current) {
                last = current;
                notifyReact();
            }
        });
        return teardown;
    }, () => last);
}
function externalStore(value, root) {
    let last = value.current;
    const starbeam = useContext(STARBEAM);
    return useSyncExternalStore((notifyReact) => {
        let teardown = starbeam.on.advance(() => {
            root.poll();
            let current = value.current;
            if (last !== current) {
                last = current;
                notifyReact();
            }
        });
        return teardown;
    }, () => last);
}
//# sourceMappingURL=hooks.js.map