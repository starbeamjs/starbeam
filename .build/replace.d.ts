import type { TransformResult } from "rollup";
export declare function createReplacePlugin(test: (id: string) => boolean, replacements: Record<string, string>, sourcemap: boolean): {
    name: string;
    /**
     * @param {string} code
     * @param {string} id
     * @returns {import("rollup").TransformResult}
     */
    transform(code: string, id: string): TransformResult;
};
//# sourceMappingURL=replace.d.ts.map