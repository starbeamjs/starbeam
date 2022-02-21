import { Cell } from "@starbeam/core";
import { useCallback, useContext } from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import { STARBEAM } from "./provider.js";
/**
 * The purpose of this class is to present the `Cell` interface in an object
 * that changes its referential equality whenever the internal value changes.
 *
 * It's a bridge between Starbeam's timestamp-based world and React's
 * equality-based world.
 */
class UnstableCell {
    static create(value, cell) {
        return new UnstableCell(value, cell);
    }
    static next(prev, next) {
        if (prev.#value === next) {
            return prev;
        }
        else {
            return new UnstableCell(next, prev.#cell);
        }
    }
    #value;
    #cell;
    constructor(value, cell) {
        this.#value = value;
        this.#cell = cell;
    }
    get current() {
        return this.#value;
    }
    update(value) {
        this.#cell.update(value);
    }
}
export function useAtom(value) {
    const cell = Cell(value);
    let last = UnstableCell.create(value, cell);
    const starbeam = useContext(STARBEAM);
    // Create a stable subscribe callback for useSyncExternalStore.
    const subscribe = useCallback((notifyReact) => {
        // Whenever Starbeam advances...
        return starbeam.on.advance(() => {
            // If the value of our cell has changed...
            if (cell.current !== last.current) {
                // Update `last` with a new UnstableCell whose `current` is the current value of `cell`.
                last = UnstableCell.next(last, cell.current);
                // Notify React that something has happened.
                notifyReact();
            }
        });
        // starbeam.on.advance returns an unsubscriber, which we return to React to
        // call whenever this component is torn down.
    }, []);
    // Create a stable snapshot callback, which just returns the `UnstableCell` in `last`.
    const snapshot = useCallback(() => last, []);
    return useSyncExternalStore(subscribe, snapshot);
}
//# sourceMappingURL=atom.js.map