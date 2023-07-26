import js from "@starbeam/collections";
import { useResource } from "@starbeam/preact";
import { Formula } from "@starbeam/reactive";
import type { JSX } from "preact";

import { formatLocale, SYSTEM_LOCALE, SYSTEM_TZ } from "../intl.js";

export default function DateFormatterStarbeam(): JSX.Element {
  const date = useResource(Clock, []);

  const localeInfo = formatLocale(SYSTEM_LOCALE);
  return (
    <>
      <h2>A Date Formatter</h2>
      <h3>
        <>
          for {localeInfo.region} ({localeInfo.language})
        </>
      </h3>

      <button className="pure-button" onClick={date.refresh}>
        🔃
      </button>
      <p className="output">{date.formatted}</p>
    </>
  );
}

function Clock(): Formula<{ formatted: string; refresh: () => void }> {
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
