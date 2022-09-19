import { Query } from "./query.js";
export interface Package {
    name: string;
    main: string;
    root: string;
    isPrivate: boolean;
    isTypescript: boolean;
    tsconfig: string | undefined;
}
export declare function queryPackages(root: string, query?: Query): Package[];
export declare function getPackages(root: string, name: string, scope?: string): Package[];
//# sourceMappingURL=packages.d.ts.map