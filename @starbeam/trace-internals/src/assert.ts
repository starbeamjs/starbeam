export function assert(condition: any, message: string = "assertion error") {
  if (condition === false) {
    throw Error(message);
  }
}
