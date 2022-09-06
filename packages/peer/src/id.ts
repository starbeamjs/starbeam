import { getCoordination } from "./env.js";

const COORDINATION = getCoordination();

/**
 * This code provides a guaranteed-unique ID, even if there are multiple copies of `@starbeam/peer`.
 *
 * This code intentionally does not use a UUID to make it easier to use these IDs in debugging
 * context, which is their primary purpose.
 */
let idGenerator = COORDINATION.id;

if (!idGenerator) {
  let CURRENT_ID = 1;

  idGenerator = COORDINATION.id = {
    get() {
      return CURRENT_ID++;
    },
  };
}

const ID_GENERATOR = idGenerator;

/**
 * Get a fresh unique ID.
 */
export function getID(): string | number {
  return ID_GENERATOR.get();
}
