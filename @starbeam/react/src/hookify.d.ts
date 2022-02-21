import { HookBlueprint, Reactive } from "starbeam";
export declare type StarbeamHook<Args extends readonly any[] = readonly any[], Ret extends HookBlueprint<any> = HookBlueprint<any>> = (...args: Args) => Ret;
declare type IdiomaticHookArgs<Args extends readonly any[]> = {
    [P in keyof Args]: Args[P] extends Reactive<infer T> ? T : Args[P];
};
declare type HookReturn<Ret extends HookBlueprint<any>> = Ret extends HookBlueprint<infer T> ? T extends undefined ? void : T : never;
export declare function hookify<Args extends readonly any[], Ret extends HookBlueprint<any>>(hook: StarbeamHook<Args, Ret>, description?: string): (...args: IdiomaticHookArgs<Args>) => HookReturn<Ret>;
export {};
//# sourceMappingURL=hookify.d.ts.map