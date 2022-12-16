import js from "@starbeam/js";
import { Component } from "@starbeam/react";
import {
  type Reactive,
  type ResourceBlueprint,
  Cell,
  Resource,
} from "@starbeam/universal";

import {
  formatLocale,
  SYSTEM_LOCALE,
  SYSTEM_TZ,
  TIME_ZONES,
  timeZoneName,
} from "../intl.js";

export default function DateFormatterStarbeam(): JSX.Element {
  return Component(({ use }) => {
    const timeZone = Cell(SYSTEM_TZ, "timeZone");
    const date = use(Clock(timeZone));

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
            <>
              for {localeInfo.region} ({localeInfo.language})
            </>
          </h3>

          {selectBox}
          <p className="output">{date.current.formatted}</p>
        </>
      );
    };
  });
}

function Clock(
  timeZone: Reactive<string>
): ResourceBlueprint<{ formatted: string; refresh: () => void }> {
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
        timeZone: timeZone.read(),
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
