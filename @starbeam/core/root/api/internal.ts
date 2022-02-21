import { TIMELINE } from "../../core/timeline/timeline.js";

export function withAssertFrame(
  callback: () => void,
  description: string
): void {
  TIMELINE.withAssertFrame(callback, description);
}
