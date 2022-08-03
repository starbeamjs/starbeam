// @ts-check

import sh from "shell-escape-tag";
import shell from "shelljs";

/**
 * @param {string} name
 * @param {object} options
 * @param {string} [options.npm]
 * @param {string[]} [options.args]
 */
export default function doc(name, { args = [], npm = NPM } = {}) {
  shell.exec(sh`${npm} exec -- doc ${name} -o ${name}.md ${args}`);
}

export const NPM = process.env["npm_execpath"] ?? "pnpm";
