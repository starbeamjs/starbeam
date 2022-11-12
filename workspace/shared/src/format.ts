import terminalSize from "term-size";

export function terminalWidth(): number {
  return terminalSize().columns;
}
