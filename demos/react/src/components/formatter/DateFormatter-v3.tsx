import { type Reactive, Cell, Resource } from "@starbeam/core";
import js from "@starbeam/js";
import { useReactiveSetup } from "@starbeam/react";

import {
  formatLocale,
  SYSTEM_LOCALE,
  SYSTEM_TZ,
  TIME_ZONES,
  timeZoneName,
} from "../intl.js";

export default function DateFormatterStarbeam() {
  return useReactiveSetup((component) => {
    const timeZone = Cell(SYSTEM_TZ, "timeZone");
    const date = component.use(Clock(timeZone));

    return () => {
      const localeInfo = formatLocale(SYSTEM_LOCALE);

      const selectBox = (
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
                  {timeZoneName(SYSTEM_LOCALE, tz)}
                </option>
              ))}
            </select>
          </label>
        </form>
      );

      return (
        <>
          <h2>A Date Formatter</h2>
          <h3>
            for {localeInfo.region} ({localeInfo.language})
          </h3>

          {selectBox}
          <p className="output">{date.current.formatted}</p>
        </>
      );
    };
  });
}

function Clock(timeZone: Reactive<string>) {
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
        timeZone: timeZone.current,
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
