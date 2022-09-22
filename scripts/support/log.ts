import chalk from "chalk";

export function log(message: string, kind?: (message: string) => string): void {
  console.log(kind ? kind(message) : message);
}

log.newline = () => log("");

export function header(message: string, style?: "dim"): string {
  const color = style === "dim" ? chalk.greenBright : chalk.redBright;

  return color(message);
}

header.dim = (message: string) => header(message, "dim");

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

problem.header = (message: string) => problem(message, { header: true });
problem.dim = (message: string) => chalk.red.dim(message);

export function comment(message: string): string {
  return chalk.dim(message);
}

export function ok(message: string): string {
  return chalk.green(message);
}
