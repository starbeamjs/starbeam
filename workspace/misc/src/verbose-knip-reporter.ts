/* eslint-disable no-console */
import type { ReporterOptions } from "knip";

type Reporter = (options: ReporterOptions) => Promise<void>;

export default async function Reporter(
  options: ReporterOptions,
): Promise<void> {
  for (const [key, value] of Object.entries(options)) {
    if (key === "issues") continue;

    console.group(key);
    console.log(value);
    console.groupEnd();
  }

  console.group("== Issues ==");

  for (const [key, value] of Object.entries(options.issues)) {
    if (value instanceof Set) {
      console.log(key, [...value]);
    } else {
      for (const [recordKey, recordValue] of Object.entries(value)) {
        console.group(recordKey);
        console.log(recordValue);
        console.groupEnd();
      }
    }
  }

  console.groupEnd();

  return Promise.resolve();
}
