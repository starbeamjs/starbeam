import type { ReportableError } from "@starbeam-workspace/reporter";
import type { Result } from "@starbeam-workspace/shared";

export function fallible<Args extends unknown[], Ret>(
  fn: (...args: Args) => Result<Ret, ReportableError>,
): (...args: Args) => Result<Ret, ReportableError> {
  return fn;
}
