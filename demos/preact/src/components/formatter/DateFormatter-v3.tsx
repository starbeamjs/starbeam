import type { Reactive } from "@starbeam/core";
import { Cell, Resource, Static } from "@starbeam/core";
import js from "@starbeam/js";
import { create, use } from "@starbeam/preact";
import type { JSX } from "preact";

import {
  formatLocale,
  SYSTEM_LOCALE,
  SYSTEM_TZ,
  TIME_ZONES,
  timeZoneName,
} from "../intl.js";

export default function DateFormatterStarbeam(): JSX.Element {
  const timeZone = create(() => Cell(SYSTEM_TZ, "timeZone"));
  const date = use(Clock(timeZone));

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
      <p className="output">{date.formatted}</p>
    </>
  );
}

function Clock(timeZone: Reactive<string>) {
  const date = js.object({ now: new Date() });

  function refresh() {
    date.now = new Date();
  }

  return Resource((resource) => {
    const interval = setInterval(() => refresh(), 1000);

    resource.on.cleanup(() => clearInterval(interval));

    return Static({
      formatted: formatTime(date.now, {
        timeZone: timeZone.read(),
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
