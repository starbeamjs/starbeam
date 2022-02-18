import type { minimal } from "@domtree/flavors";
import type { DomEnvironment } from "../environment.js";
import type { ContentCursor } from "./cursor.js";
import type { Hydration, Marker } from "./marker.js";
export declare class Tokens {
    #private;
    readonly environment: DomEnvironment;
    static create(environment: DomEnvironment): Tokens;
    private constructor();
    nextToken(): Token;
    mark<B, Out>(buffer: B, marker: Marker<B, Out>, body?: (buffer: B) => B): Dehydrated<Out>;
}
export declare class Token {
    #private;
    static of(tokenId: string): Token;
    private constructor();
}
export declare class Dehydrated<Hydrated = unknown> {
    #private;
    readonly environment: DomEnvironment;
    /**
     * @internal
     */
    static create<Hydrated>(environment: DomEnvironment, token: Token, hydrator: Hydration<Hydrated>): Dehydrated<Hydrated>;
    /**
     * @internal
     */
    static hydrate<Hydrated>(environment: DomEnvironment, hydrator: Dehydrated<Hydrated>, container: minimal.ParentNode): Hydrated;
    private constructor();
    get dom(): LazyDOM<Hydrated>;
}
export declare class LazyDOM<Hydrated> {
    #private;
    readonly environment: DomEnvironment;
    static create<Hydrated>(environment: DomEnvironment, dehydrated: Dehydrated<Hydrated>): LazyDOM<Hydrated>;
    private constructor();
    get(inside: minimal.ParentNode): Hydrated;
    insert(this: LazyDOM<minimal.ChildNode>, at: ContentCursor): void;
}
export declare function tokenId(token: Token): string;
