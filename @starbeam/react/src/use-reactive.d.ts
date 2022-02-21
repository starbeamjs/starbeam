import { type AnyRecord } from "starbeam";
import { ReactiveComponent, type ReactiveProps } from "./component.js";
export declare function useReactive<T, Props extends AnyRecord>(definition: (props: ReactiveProps<Props>, parent: ReactiveComponent) => () => T, props: Props, description?: string): T;
//# sourceMappingURL=use-reactive.d.ts.map