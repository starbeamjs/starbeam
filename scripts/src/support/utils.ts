export const logged = <T>(
  value: T,
  log: (value: T) => void = console.log
): T => {
  log(value);
  return value;
};

export function dir(value: unknown): void {
  console.dir(value, { depth: null, customInspect: true });
}
