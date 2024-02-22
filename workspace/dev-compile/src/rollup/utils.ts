import type { Plugin as RollupPlugin } from "rollup";

export type { RollupPlugin };
export type InlinePlugin = () => RollupPlugin;
