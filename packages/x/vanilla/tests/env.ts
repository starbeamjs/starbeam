import { Body } from "./vanilla.spec";

interface Env {
  global: typeof globalThis;
  document: Document;
  body: Body;
  owner: object;
}

export function env(): Env {
  return {
    global: globalThis,
    document: globalThis.document,
    body: new Body(globalThis.document.body),
    owner: {},
  };
}
