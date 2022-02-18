/// <reference types="jest" />
import type { MatchResult } from "./report.js";
declare global {
    namespace jest {
        interface Matchers<R> {
            starbeam(): CustomMatcherResult;
        }
    }
}
export declare function starbeam(result: MatchResult): jest.CustomMatcherResult;
