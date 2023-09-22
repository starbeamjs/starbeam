import js from "@starbeam/collections";
import type { Reactive } from "@starbeam/interfaces";
import { setup, useResource } from "@starbeam/preact";
import {
  Cell,
  read,
  Resource,
  type ResourceBlueprint,
} from "@starbeam/universal";
import type { JSX } from "preact";

import {
  formatLocale,
  SYSTEM_LOCALE,
  SYSTEM_TZ,
  TIME_ZONES,
  timeZoneName,
} from "../intl.js";

export default function DateFormatterStarbeam(): JSX.Element {
  const timeZone = setup(() => Cell(SYSTEM_TZ, "timeZone"));
  const date = useResource(() => Clock(timeZone), []);

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

function Clock(
  timeZone: Reactive<string> | string,
): ResourceBlueprint<{ formatted: string; refresh: () => void }> {
  return Resource(({ on }) => {
    const date = js.object({ now: new Date() });

    function refresh(): void {
      date.now = new Date();
    }

    on.sync(() => {
      const interval = setInterval(() => {
        refresh();
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    });

    return {
      formatted: formatTime(date.now, {
        timeZone: read(timeZone),
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
  }: { locale?: string; timeZone?: string } = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "longGeneric",
    timeZone,
  }).format(date);
}
