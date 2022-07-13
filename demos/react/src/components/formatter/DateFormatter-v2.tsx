import { Resource } from "@starbeam/core";
import js from "@starbeam/js";
import { useReactiveSetup } from "@starbeam/react";

import { formatLocale, SYSTEM_LOCALE, SYSTEM_TZ } from "../intl.js";

export default function DateFormatterStarbeam() {
  return useReactiveSetup((component) => {
    const date = component.use(Clock());

    return () => {
      const localeInfo = formatLocale(SYSTEM_LOCALE);
      return (
        <>
          <h2>A Date Formatter</h2>
          <h3>
            for {localeInfo.region} ({localeInfo.language})
          </h3>

          <p className="output">{date.current.formatted}</p>
        </>
      );
    };
  });
}

function Clock() {
  const date = js.object({ now: new Date() });

  function refresh() {
    date.now = new Date();
  }

  return Resource((resource) => {
    resource.on.setup(() => {
      const interval = setInterval(() => refresh(), 1000);

      return () => clearInterval(interval);
    });
    return () => ({
      formatted: formatTime(date.now, {
        timeZone: SYSTEM_TZ,
        locale: SYSTEM_LOCALE,
      }),
      refresh,
    });
  });
}

function formatTime(
  date: Date,
  {
    locale = SYSTEM_LOCALE,
    timeZone = SYSTEM_TZ,
  }: { locale?: string; timeZone?: string } = {}
) {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "longGeneric",
    timeZone,
  }).format(date);
}
