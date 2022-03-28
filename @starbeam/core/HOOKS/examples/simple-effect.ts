import type { Reactive } from "@starbeam/reactive";
import { reactive } from "@starbeam/core";

function LogDuration(
  seconds: Reactive<number>,
  options?: { numeric?: "force"; style?: "long" | "short" | "narrow" }
) {
  const formatted = reactive(() =>
    new Intl.RelativeTimeFormat(undefined, {
      numeric: options?.numeric ? "always" : "auto",
      style: options?.style,
    }).format(seconds.current, "seconds")
  );

  return () => {
    console.log(formatted.current);
  };
}
