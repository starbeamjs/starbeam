import js from "@starbeam/js";
import { create, use } from "@starbeam/preact";
import type { ResourceBlueprint } from "@starbeam/universal";
import { type Reactive, Cell, Resource } from "@starbeam/universal";
import type { JSX } from "preact/jsx-runtime";

import {
  formatLocale,
  SYSTEM_LOCALE,
  SYSTEM_TZ,
  TIME_ZONES,
  timeZoneName,
} from "../intl.js";

export default function DateFormatterStarbeam(props: {
  locale: string;
}): JSX.Element {
  const timeZone = create(() => Cell(SYSTEM_TZ, "time zone"));

  const date = use(() => Clock(timeZone, props.locale));

  const localeInfo = formatLocale(props.locale);
  return (
    <>
      <h2>A Date Formatter</h2>
      <h3>
        <>
          for {localeInfo.region} ({localeInfo.language})
        </>
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
): ResourceBlueprint<{ formatted: string; refresh: () => void }, undefined> {
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
        timeZone: typeof timeZone === "string" ? timeZone : timeZone.read(),
        locale: typeof locale === "string" ? locale : locale.read(),
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
