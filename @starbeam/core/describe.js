import { strippableDescribe } from "./strippable/description.js";
export function describeValue(value) {
    return strippableDescribe(value) || String(value);
}
//# sourceMappingURL=describe.js.map