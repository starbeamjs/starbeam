import { ReactiveCell } from "../cell.js";
export function createStorage(value, callback, description = "storage") {
    return ReactiveCell.create(value, description);
}
export function getValue(storage) {
    return storage.current;
}
export function setValue(storage, value) {
    storage.update(value);
}
//# sourceMappingURL=tracked-shim.js.map