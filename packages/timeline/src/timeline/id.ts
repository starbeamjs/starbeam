let ID = 1;

export function getID(): string {
  return String(ID++);
}
