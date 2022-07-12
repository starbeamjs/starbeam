import { type Reactive, Resource } from "@starbeam/core";
import js from "@starbeam/js";
import { useCell, useReactive, useResource } from "@starbeam/react";

import {
  formatLocale,
  SYSTEM_LOCALE,
  SYSTEM_TZ,
  TIME_ZONES,
  timeZoneName,
} from "../intl.js";

export default function DateFormatterStarbeam(props: { locale: string }) {
  const timeZone = useCell(SYSTEM_TZ, "time zone");

  const date = useResource(() => {
    return Clock(timeZone, props.locale);
  }, [props.locale]);

  const localeInfo = formatLocale(props.locale);
  return (
    <>
      <h2>A Date Formatter</h2>
      <h3>
        for {localeInfo.region} ({localeInfo.language})
      </h3>

      <form>
        <label>
          <span>Time Zone</span>
          <select
            size={5}
            value={useReactive(() => timeZone.current)}
            onInput={(e) => (timeZone.current = e.currentTarget.value)}
          >
            {TIME_ZONES.map((tz) => (
              <option key={tz} value={tz}>
                {timeZoneName(props.locale, tz)}
              </option>
            ))}
          </select>
        </label>
      </form>
      <p className="output">{date.formatted}</p>
    </>
  );
}

function Clock(
  timeZone: Reactive<string> | string,
  locale: Reactive<string> | string
) {
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
        timeZone: typeof timeZone === "string" ? timeZone : timeZone.current,
        locale: typeof locale === "string" ? locale : locale.current,
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
