import js from "@starbeam/collections";
import { setup, useReactive } from "@starbeam/react";
import {
  Cell,
  type Reactive,
  Resource,
  type ResourceBlueprint,
} from "@starbeam/universal";

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
  const timeZone = setup(() => Cell(SYSTEM_TZ));
  const date = useReactive(
    ({ use }) => use(Clock(timeZone, props.locale)),
    [props.locale]
  );

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
            value={useReactive(timeZone)}
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
      <p className="output">{date?.formatted}</p>
    </>
  );
}

function Clock(
  timeZone: Reactive<string> | string,
  locale: Reactive<string> | string
): ResourceBlueprint<{ formatted: string; refresh: () => void }> {
  const date = js.object({ now: new Date() });

  function refresh(): void {
    date.now = new Date();
  }

  return Resource(({ on }) => {
    const interval = setInterval(() => {
      refresh();
    }, 1000);

    on.cleanup(() => {
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
  // .initial(() => {
  //   return {
  //     formatted: formatTime(date.now, {
  //       timeZone: typeof timeZone === "string" ? timeZone : timeZone.read(),
  //       locale: typeof locale === "string" ? locale : locale.read(),
  //     }),
  //     refresh,
  //   };
  // });
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
