import type { browser } from "@domtree/flavors";
import { HookBlueprint } from "starbeam";
declare const REF: unique symbol;
declare type REF = typeof REF;
interface Ref<E extends browser.Element> {
    (element: E): void;
    readonly [REF]: true;
}
export declare function ref<E extends browser.Element>(kind: abstract new (...args: any[]) => E): Ref<E>;
declare const Layout_base: (new <T_1>(...args: ["Rendering"] | ["Rendered(T)", T_1]) => import("../../../src/reactive/enumeration.js").EnumInstance1<"Rendering" | "Rendered(T)", T_1>) & {
    Rendering: <This extends abstract new (discriminant: "Rendering") => Instance, Instance>(this: This) => Instance;
    Rendered: <This_1 extends abstract new (discriminant: "Rendered(T)", value: T_2) => Instance_1, Instance_1, T_2>(this: This_1, value: T_2) => Instance_1;
};
declare class Layout<T> extends Layout_base<T> {
    map<U>(callback: (value: T) => U): Layout<U>;
    get rendered(): T;
}
export declare function useModifier<T, E extends browser.Element>(ref: Ref<E>, hook: (element: E) => HookBlueprint<T>): Layout<T>;
export declare function use<T>(hook: HookBlueprint<T>): T;
export {};
//# sourceMappingURL=hooks.d.ts.map