// eslint-disable-next-line unused-imports/no-unused-vars
const { Linter } = require("eslint");

module.exports = class Rules {
  /**
   * @param {(rules: Rules) => Rules} callback
   * @returns {Linter.RulesRecord}
   */
  static build(callback) {
    const rules = new Rules();
    callback(rules);
    return rules.#rules;
  }

  /** @type {Linter.RulesRecord} */
  #rules = {};

  /**
   * @param {string | string[]} rule
   * @param {Linter.RuleLevel | Record<string, unknown> | [Linter.RuleLevel, Record<string, unknown>] } [entry]
   * @returns {Rules}
   */
  replace(rule, entry = "error") {
    if (Array.isArray(rule)) {
      rule.forEach((r) => this.replace(r, entry));
    } else {
      this.#rules[rule] = "off";

      if (Array.isArray(entry) || typeof entry === "string") {
        this.#rules[`@typescript-eslint/${rule}`] = entry;
      } else {
        this.#rules[`@typescript-eslint/${rule}`] = ["error", entry];
      }
    }

    return this;
  }

  /**
   * @param {string | string[]} rule
   * @param {Linter.RuleLevel | Record<string, unknown> | [Linter.RuleLevel, Record<string, unknown>] } [entry]
   * @returns {Rules}
   */
  typed(rule, entry = "error") {
    if (Array.isArray(rule)) {
      rule.forEach((r) => this.typed(r, entry));
    } else {
      if (Array.isArray(entry) || typeof entry === "string") {
        this.#rules[`@typescript-eslint/${rule}`] = entry;
      } else {
        this.#rules[`@typescript-eslint/${rule}`] = ["error", entry];
      }
    }

    return this;
  }

  /**
   * @param {{untyped?: string | string[], typed?: string | string[], both?: string | string[]}} rules
   * @returns {Rules}
   */
  disable(rules) {
    const { untyped, typed, both } = rules;

    this.#disableUntyped(untyped);
    this.#disableUntyped(both);

    this.#disableTyped(typed);
    this.#disableTyped(both);

    return this;
  }

  /**
   * @param {string | string[] | undefined} rules
   */
  #disableUntyped(rules) {
    if (rules === undefined) {
      return;
    }

    if (Array.isArray(rules)) {
      rules.forEach((rule) => {
        this.#rules[rule] = "off";
      });
    } else {
      this.#rules[rules] = "off";
    }
  }

  /**
   * @param {string | string[] | undefined} rules
   */
  #disableTyped(rules) {
    if (rules === undefined) {
      return;
    }

    if (Array.isArray(rules)) {
      rules.forEach((rule) => {
        this.#rules[`@typescript-eslint/${rule}`] = "off";
      });
    } else {
      this.#rules[`@typescript-eslint/${rules}`] = "off";
    }
  }
};
