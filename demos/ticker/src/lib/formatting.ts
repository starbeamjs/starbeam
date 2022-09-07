// format as YYYY-MM-DD
const DateTimeFormat = new Intl.DateTimeFormat("fr-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function yesterday() {
  const date = new Date();
  // this works even if the current date is the first of the month
  date.setDate(date.getDate() - 1);
  return DateTimeFormat.format(date);
}

const NumberFormat = new Intl.NumberFormat();

export function fmt(value: number) {
  return NumberFormat.format(value);
}
