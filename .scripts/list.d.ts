import type { Command } from "commander";
import type { StarbeamCommandOptions } from "./commands.js";
import { type Package } from "./support/packages.js";
import { Query } from "./support/query.js";
export declare function ListCommand({ root }: StarbeamCommandOptions): Command;
export declare function queryable<T>(root: string, command: Command, action: (packages: Package[], options: {
    query: Query;
} & T) => void | Promise<void>): Command;
//# sourceMappingURL=list.d.ts.map