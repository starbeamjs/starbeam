/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { readFileSync } from "node:fs";

import { default as Ajv } from "ajv";

const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

/**
 * @template T
 * @param {string} file
 * @param {string} schema
 * @returns {T}
 */
export function loadJSON(file, schema) {
  const object = /** @type {object} */ (JSON.parse(readFileSync(file, "utf8")));
  return validate(object, schema);
}

/**
 * @template T
 * @param {object} json
 * @param {string} schema
 * @returns {T}
 */
export function validate(json, schema) {
  const parsedSchema = /** @type {import("ajv").JSONSchemaType<unknown>} */ (
    JSON.parse(readFileSync(schema, "utf8"))
  );
  const validateSchema = ajv.compile(parsedSchema);

  const isValid = ajv.validate(parsedSchema, json);

  if (!isValid) {
    console.error(validateSchema.errors);
    process.exit(1);
  }

  return /** @type {T} */ (json);
}
