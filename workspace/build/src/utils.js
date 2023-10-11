/**
 * @template T
 * @param {string} string
 * @returns {T}
 */
export function parse(string) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return JSON.parse(string);
}
