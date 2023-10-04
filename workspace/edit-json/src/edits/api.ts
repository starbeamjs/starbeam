import { insert as insertIntoArray } from "./array/insert.js";
import { remove as removeFromArray } from "./array/remove.js";
import { removeMatches } from "./array/remove-matches.js";
import { insert as insertIntoObject } from "./object/insert.js";
import { remove as removeFromObject } from "./object/remove.js";

export const modifications = {
  array: {
    insert: insertIntoArray,
    remove: removeFromArray,
    removeMatches,
  },

  object: {
    insert: insertIntoObject,
    remove: removeFromObject,
  },
};
