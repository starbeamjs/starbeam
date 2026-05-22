// At runtime these imports are resolved to ember-source's bundled copies by
// embroider's resolver. ember-source 6.12+ ships type declarations for them at
// `ember-source/types/stable/@glimmer/...`, but for compatibility with older
// ember-source releases (e.g. 6.10) we declare the surface we use here.
declare module "@glimmer/validator" {
  // Minimal subset of @glimmer/interfaces that we touch through here.
  export interface Tag {
    [key: symbol]: unknown;
  }
  export interface DirtyableTag extends Tag {}
  export function createTag(): DirtyableTag;
  export function consumeTag(tag: Tag): void;
  export function dirtyTag(tag: DirtyableTag): void;
}

declare module "@glimmer/destroyable" {
  type Destroyable = object;
  export function registerDestructor<T extends Destroyable>(
    destroyable: T,
    destructor: (destroyable: T) => void,
    eager?: boolean,
  ): (destroyable: T) => void;
}
