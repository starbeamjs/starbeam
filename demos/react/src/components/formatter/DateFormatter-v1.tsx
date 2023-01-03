import js from "@starbeam/js";
import { useSetup } from "@starbeam/react";
import type { Reactive } from "@starbeam/universal";
import { Formula } from "@starbeam/universal";
import type { JSXElementConstructor } from "react";

import { formatLocale, SYSTEM_LOCALE, SYSTEM_TZ } from "../intl.js";

type JsxReturn = React.ReactElement<
  unknown,
  string | JSXElementConstructor<unknown>
>;

export default function DateFormatterStarbeam(): JsxReturn {
  return useSetup(() => {
    const date = Clock();

    return () => {
      const localeInfo = formatLocale(SYSTEM_LOCALE);
      return (
        <>
          <h2>A Date Formatter</h2>
          <h3>
            <>
              for {localeInfo.region} ({localeInfo.language})
            </>
          </h3>

          <button
            className="pure-button"
            onClick={() => {
              date.read().refresh();
            }}
          >
            🔃
          </button>
          <p className="output">{date.current.formatted}</p>
        </>
      );
    };
  }).compute();
}

function Clock(): Reactive<{ formatted: string; refresh: () => void }> {
  const date = js.object({ now: new Date() });

  function refresh(): void {
    date.now = new Date();
  }

  return Formula(() => {
    return {
      formatted: formatTime(date.now, {
        timeZone: SYSTEM_TZ,
        locale: SYSTEM_LOCALE,
      }),
      refresh,
    };
  });
}

function formatTime(
  date: Date,
  {
    locale = SYSTEM_LOCALE,
    timeZone = SYSTEM_TZ,
  }: { locale?: string; timeZone?: string } = {}
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "longGeneric",
    timeZone,
  }).format(date);
}
