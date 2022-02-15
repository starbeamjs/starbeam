import { builtin } from "../reactive/builtins/reactive.js";
declare type BuiltinFunction = typeof builtin;
interface ReactiveDecorator {
    (target: object, key: symbol | string): void;
}
interface ReactiveFunction extends BuiltinFunction, ReactiveDecorator {
}
export declare const reactive: ReactiveFunction;
export declare const cached: <T>(_target: object, key: symbol | string, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T>;
export {};
