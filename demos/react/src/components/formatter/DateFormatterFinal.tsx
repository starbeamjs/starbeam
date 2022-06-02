import { type Reactive, Cell, Resource } from "@starbeam/core";
import js from "@starbeam/js";
import { useProp, useStarbeam } from "@starbeam/react";

import {
  formatLocale,
  SYSTEM_LOCALE,
  SYSTEM_TZ,
  TIME_ZONES,
  timeZoneName,
} from "../intl.js";

export default function DateFormatterStarbeam(props: { locale: string }) {
  const locale = useProp(props.locale, "locale");

  return useStarbeam((component) => {
    const timeZone = Cell(SYSTEM_TZ, "timeZone");

    const date = component.use(Clock(timeZone, locale));

    return () => {
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
                value={timeZone.current}
                onInput={(e) => (timeZone.current = e.currentTarget.value)}
              >
                {TIME_ZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {timeZoneName(locale.current, tz)}
                  </option>
                ))}
              </select>
            </label>
          </form>
          <p className="output">{date.current.formatted}</p>
        </>
      );
    };
  });
}

function Clock(timeZone: Reactive<string>, locale: Reactive<string>) {
  const date = js.object({ now: new Date() });

  function refresh() {
    date.now = new Date();
  }

  return Resource((resource) => {
    const interval = setInterval(() => refresh(), 1000);

    resource.on.cleanup(() => clearInterval(interval));

    return () => ({
      formatted: formatTime(date.now, {
        timeZone: timeZone.current,
        locale: locale.current,
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
