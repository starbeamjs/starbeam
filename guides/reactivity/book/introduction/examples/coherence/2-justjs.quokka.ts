export interface DateStamp {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

function toJsDate({ year, month, day }: DateStamp): Date {
  return new Date(year, month - 1, day);
}

function formatDate(date: DateStamp, locale = SYSTEM_LOCALE): string {
  return Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(toJsDate(date));
}

export interface Person {
  readonly name: string;
  readonly birthday: DateStamp;
}

export function createPerson(
  name: string,
  [year, month, day]: [year: number, month: number, day: number]
): Person {
  return {
    name,
    birthday: { year, month, day },
  };
}

export const SYSTEM_LOCALE = new Intl.DateTimeFormat().resolvedOptions().locale;

export function formatPerson(
  person: Person,
  locale: string = SYSTEM_LOCALE
): string {
  return `${person.name} (born ${formatDate(person.birthday, locale)})`;
}

const wycats = createPerson("Yehuda Katz", [1982, 5, 10]);

formatPerson(wycats); //?
