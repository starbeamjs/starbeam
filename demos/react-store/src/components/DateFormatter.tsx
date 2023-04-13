import { useSetup } from "@starbeam/react";
import {
  Cell,
  type Reactive,
  readReactive,
  Resource,
  type ResourceBlueprint,
} from "@starbeam/universal";

import {
  formatLocale,
  SYSTEM_LOCALE,
  SYSTEM_TZ,
  TIME_ZONES,
  timeZoneName,
} from "./intl.js";

export default function (props: { locale: string }): JSX.Element {
  return useSetup(({ use }) => {
    const timeZone = Cell(SYSTEM_TZ, "system time zone");
    // FIXME: The fact that this uses closure state will cause confusion relative to other places
    // where we take props as an argument. TL;DR: useSetup should be able to take props as an
    // argument.
    const date = use(Clock(timeZone, props.locale));

    return ({ locale }: { locale: string }) => {
      const localeInfo = formatLocale(locale);
      const formattedLocale = localeInfo.region
        ? `${localeInfo.region} (${localeInfo.language})`
        : localeInfo.language;

      return (
        <>
          <h2>A Date Formatter</h2>
          <h3>{`for ${formattedLocale}`}</h3>

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
                    {timeZoneName(locale, tz)}
                  </option>
                ))}
              </select>
            </label>
          </form>

          <p className="output">{date.current?.formatted}</p>
        </>
      );
    };
  }).compute(props);
}

function Clock(
  timeZone: Reactive<string>,
  locale: Reactive<string> | string
): ResourceBlueprint<{ formatted: string; refresh: () => void }> {
  const date = Cell(new Date(), "current time");

  function refresh(): void {
    date.current = new Date();
  }

  return Resource((resource) => {
    const interval = setInterval(() => {
      refresh();
    }, 1000);

    resource.on.cleanup(() => {
      clearInterval(interval);
    });

    return {
      formatted: formatDate(
        date.current,
        readReactive(locale),
        timeZone.read()
      ),
      refresh,
    };
  });
}

function formatDate(
  date: Date,
  locale = SYSTEM_LOCALE,
  timeZone = SYSTEM_TZ
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "long",
    timeZone,
  }).format(date);
}
