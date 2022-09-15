declare module "*?inline" {
  const content: string;
  export default content;
}

declare namespace JSX {
  type IntrinsicElements = import("preact").h.JSX.IntrinsicElements;
}
