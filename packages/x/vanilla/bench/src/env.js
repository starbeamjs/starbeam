import { Cursor } from '@starbeamx/vanilla';

export function env() {
  return {
    global: globalThis,
    document: globalThis.document,
    body: new Body(document.querySelector('#bench-container')),
    owner: {},
  };
}

export class Body {
  #body;
  #snapshot;

  constructor(body) {
    this.#body = body;
    this.#snapshot = [...body.childNodes];
  }

  get cursor() {
    return Cursor.appendTo(this.#body);
  }

  get innerHTML() {
    return this.#body.innerHTML;
  }

  snapshot() {
    this.#snapshot = [...this.#body.childNodes];
  }
}
