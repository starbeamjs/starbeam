import { LinesAndColumns } from "lines-and-columns";

const FIRST_LINE = 0;
const LINE_INCREMENT = 1;

/**
 * Identify the last position in the source that is an appropriate location to
 * insert text before this offset.
 *
 * The reason this is not just the
 *
 * The offset represents the very end of a container, and if the end of a
 * container is on its own line after a newline (with possible preceding spaces),
 * then the offset is the end of the preceding line.
 */
export function lastCursorBefore(source: string, offset: number): number {
  const lac = new LinesAndColumns(source);
  const location = lac.locationForIndex(offset);

  if (location === null) {
    throw Error(`BUG: Unable to find location for offset ${offset}`);
  }

  const { line: lineno, column } = location;
  const lines = source.split("\n");

  const line = lines[lineno];

  if (line === undefined) {
    throw Error(`BUG: Unable to find line ${lineno}`);
  }

  const hasEmptyPrefix = sliceChars(line, column).trim() === "";

  if (lineno !== FIRST_LINE && hasEmptyPrefix) {
    const prevLine = lineno - LINE_INCREMENT;
    const prev = lines[prevLine] as string;
    const correctedLocation = { line: prevLine, column: prev.length };
    const correctedOffset = lac.indexForLocation(correctedLocation);

    if (correctedOffset === null) {
      throw Error(
        `BUG: Unable to find location for corrected location (line=${correctedLocation.line}, column=${correctedLocation.column})`,
      );
    }

    return correctedOffset;
  } else {
    return offset;
  }
}

/**
 * Identify the first position in the source that is an appropriate location to
 * insert text after this offset.
 *
 * This skips over whitespace after the offset and identifies the first non-whitespace
 * character after the offset.
 *
 * This function returns `newline: true` if a newline is between the specified
 * offset and the returned cursor.
 */
export function firstCursorAfter(
  source: string,
  offset: number,
): { cursor: number; newline: boolean } {
  const match = /^\s*/.exec(source.slice(offset));

  if (match === null) {
    return { cursor: offset, newline: false };
  }

  const [whitespace] = match;

  return {
    cursor: offset + whitespace.length,
    newline: whitespace.includes("\n"),
  };
}

const START_OFFSET = 0;

function sliceChars(source: string, length: number): string {
  return source.slice(START_OFFSET, length);
}
