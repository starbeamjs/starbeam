import {
  isArray,
  isObject,
  isPrimitive,
  type JsonArray,
  type JsonObject,
  type JsonPrimitive,
  type JsonValue,
} from "typed-json-utils";
import { assertType, describe, test } from "vitest";

describe("type narrowing", () => {
  const jsonValue = {} as JsonValue;

  describe("isPrimitive", () => {
    test("isPrimitive narrows correctly to the appropriate primitive type", () => {
      if (isPrimitive(jsonValue, Number)) {
        assertType<number>(jsonValue);
      }

      if (isPrimitive(jsonValue, String)) {
        assertType<string>(jsonValue);
      }

      if (isPrimitive(jsonValue, null)) {
        assertType<null>(jsonValue);
      }

      if (isPrimitive(jsonValue, Boolean)) {
        assertType<boolean>(jsonValue);
      }
    });

    test("going through all of the checks exhausts the type", () => {
      if (isArray(jsonValue)) {
        assertType<JsonArray>(jsonValue);
        return;
      }

      assertType<JsonPrimitive | JsonObject>(jsonValue);

      if (isObject(jsonValue)) {
        assertType<JsonObject>(jsonValue);
        return;
      }

      assertType<JsonPrimitive>(jsonValue);

      if (jsonValue === null) {
        assertType<null>(jsonValue);
        return;
      }

      assertType<string | number | boolean>(jsonValue);

      if (isPrimitive(jsonValue, String)) {
        assertType<string>(jsonValue);
        return;
      }

      assertType<number | boolean>(jsonValue);

      if (isPrimitive(jsonValue, Boolean)) {
        assertType<boolean>(jsonValue);
        return;
      }

      assertType<number>(jsonValue);
    });

    test("isObject narrows away JsonObject", () => {
      if (isObject(jsonValue)) {
        assertType<JsonObject>(jsonValue);
        return;
      }

      assertType<Exclude<JsonValue, JsonObject>>(jsonValue);
    });

    test("isArray narrows away JsonArray", () => {
      if (isArray(jsonValue)) {
        assertType<JsonArray>(jsonValue);
        return;
      }

      assertType<Exclude<JsonValue, JsonArray>>(jsonValue);
    });

    test("isPrimitive(String) narrows away strings", () => {
      if (isPrimitive(jsonValue, String)) {
        assertType<string>(jsonValue);
        return;
      }

      assertType<Exclude<JsonValue, string>>(jsonValue);
    });

    test("isPrimitive(Boolean) narrows away booleans", () => {
      if (isPrimitive(jsonValue, Boolean)) {
        assertType<boolean>(jsonValue);
        return;
      }

      assertType<Exclude<JsonValue, boolean>>(jsonValue);
    });

    test("isPrimitive(Number) narrows away numbers", () => {
      if (isPrimitive(jsonValue, Number)) {
        assertType<number>(jsonValue);
        return;
      }

      assertType<Exclude<JsonValue, number>>(jsonValue);
    });

    test("null checks narrow away null", () => {
      if (jsonValue === null) {
        assertType<null>(jsonValue);
        return;
      }

      assertType<Exclude<JsonValue, null>>(jsonValue);
    });
  });

  describe("isArray", () => {
    test("narrows arrays", () => {
      const jsonArray = [1, 2, 3] as JsonValue;

      if (isArray(jsonArray)) {
        assertType<JsonArray>(jsonArray);
        return;
      }

      assertType<Exclude<JsonValue, JsonArray>>(jsonArray);
    });
  });

  describe("isObject", () => {
    test("narrows objects", () => {
      const jsonObject = { a: 1, b: 2, c: 3 } as JsonValue;

      if (isObject(jsonObject)) {
        assertType<JsonObject>(jsonObject);
        return;
      }

      assertType<Exclude<JsonValue, JsonObject>>(jsonObject);
    });
  });
});
