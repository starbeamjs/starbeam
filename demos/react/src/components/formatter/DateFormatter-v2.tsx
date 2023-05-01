import * as js from "@starbeam/collections";
import { useReactive } from "@starbeam/react";
import { Formula, type ResourceBlueprint } from "@starbeam/universal";
import { Resource } from "@starbeam/universal";

import { formatLocale, SYSTEM_LOCALE, SYSTEM_TZ } from "../intl.js";

export default function DateFormatterStarbeam(): JSX.Element {
  return useReactive(({ use }) => {
    const date = use(Clock());

    return Formula(() => {
      const localeInfo = formatLocale(SYSTEM_LOCALE);
      return (
        <>
          <h2>A Date Formatter</h2>
          <h3>
            <>
              for {localeInfo.region} ({localeInfo.language})
            </>
          </h3>

          <p className="output">{date.current.formatted}</p>
        </>
      );
    });
  }, []);
}

function Clock(): ResourceBlueprint<{
  formatted: string;
  refresh: () => void;
}> {
  const date = js.object({ now: new Date() });

  function refresh(): void {
    date.now = new Date();
  }

  return Resource((resource) => {
    const interval = setInterval(() => {
      refresh();
    }, 1000);

    resource.on.cleanup(() => {
      clearInterval(interval);
    });

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
