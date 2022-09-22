import chalk from "chalk";

export function log(message: string, kind: (message: string) => string): void {
  console.log(kind(message));
}

export function header(message: string): string {
  return chalk.redBright(message);
}

export function problem(
  message: string,
  options?: { header: boolean }
): string {
  if (options?.header) {
    return chalk.redBright(message);
  } else {
    return chalk.red(message);
  }
}

export function comment(message: string): string {
  return chalk.dim(message);
}

export function ok(message: string): string {
  return chalk.green(message);
}
