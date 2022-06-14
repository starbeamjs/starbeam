declare module "*?raw" {
  const content: string;
  export default content;
}

declare module "*.js?script" {
  const content: string;
  export default content;
}

declare module "*.svg" {
  const content: string;
  export default content;
}
