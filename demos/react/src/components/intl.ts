export const TIME_ZONES = [
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Seoul",
  "Asia/Singapore",
  "Europe/Kiev",
];

export const LOCALES = [
  "sv-SE",
  "de-DE",
  "en-US",
  "uk-UA",
  "en-GB",
  "es-ES",
  "es-MX",
  "fr-FR",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "pt-BR",
];

export const SYSTEM_LOCALE = Intl.DateTimeFormat().resolvedOptions().locale;
export const SYSTEM_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function formatLocale(localeName: string) {
  const locale = new Intl.Locale(localeName);
  return {
    language: localeInfo(locale, locale.language, "language"),
    region: localeInfo(locale, locale.region, "region"),
    full: localeInfo(locale, localeName, "language"),
  };
}

function localeInfo(
  locale: Intl.Locale,
  code: string,
  type: Intl.DisplayNamesType
): string;
function localeInfo(
  locale: Intl.Locale,
  code: string | undefined,
  type: Intl.DisplayNamesType
): string | void;
function localeInfo(
  locale: Intl.Locale,
  code: string | undefined,
  type: Intl.DisplayNamesType
): string | void {
  if (code) {
    return new Intl.DisplayNames([locale.language], { type }).of(code);
  }
}

export function timeZoneName(locale: string, timeZone: string): string {
  const tz = new Intl.DateTimeFormat(locale, {
    timeZone,
    timeZoneName: "long",
  })
    .formatToParts(new Date())
    .find(({ type }) => type === "timeZoneName");

  if (tz === undefined) {
    throw Error(
      `Could not find time zone name for specified time zone: ${timeZone}`
    );
  }

  return tz.value;
}
