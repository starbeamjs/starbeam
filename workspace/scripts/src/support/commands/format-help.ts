import chalk, { type ColorSupportLevel } from "chalk";
import type { Command, Help, Option as CommanderOption } from "commander";

const DEFAULT_WIDTH = 80;
const INDENTED = 2;
const START_LINE_MARKER = "› ";
const END_LINE_MARKER = " ‹ ";

const LINE_MARKERS = [START_LINE_MARKER, END_LINE_MARKER] as const;
const LINE_MARKER_SIZE = START_LINE_MARKER.length + END_LINE_MARKER.length;
const STRING_START = 0;
const EMPTY_SIZE = 0;

export function formatHelp(help: Help, cmd: Command, helper: Help): string {
  const termWidth = helper.padWidth(cmd, helper);
  const helpWidth = helper.helpWidth || DEFAULT_WIDTH;
  const itemIndentWidth = 2;
  const itemSeparatorWidth = 2; // between term and description
  const seenKinds = new Set<OptionKind>();

  function formatItem(term: string, description: string, kind: OptionKind) {
    const style = styleFor(kind);
    seenKinds.add(kind);

    if (description) {
      const fullText = `${term.padEnd(
        termWidth + itemSeparatorWidth,
      )}${description}`;
      const wrapped = helper.wrap(
        fullText,
        helpWidth - itemIndentWidth,
        termWidth + itemSeparatorWidth,
      );

      const wrappedTerm = wrapped.slice(STRING_START, term.length);

      const desc = wrapped.slice(term.length + itemSeparatorWidth);

      const wrappedDesc = style(desc)
        .replaceAll(/\(default: [^)]*\)/g, (match) => chalk.dim(match))
        .replaceAll(/[-][-][\w]+/g, (match) => chalk.underline(match));
      return (
        style.bold(wrappedTerm) + " ".repeat(itemSeparatorWidth) + wrappedDesc
      );
    }

    return term;
  }
  function formatList(textArray: string[]) {
    return textArray.join("\n").replace(/^/gm, " ".repeat(itemIndentWidth));
  }

  // Usage
  let output = [
    `${chalk.bgCyanBright("Usage")} ${chalk.cyanBright(
      helper.commandUsage(cmd),
    )}`,
    "",
  ];

  // Description
  const commandDescription = helper.commandDescription(cmd);
  if (commandDescription !== "") {
    const wrapped = helper.wrap(
      `${" ".repeat(INDENTED)}${commandDescription}`,
      helpWidth - LINE_MARKER_SIZE,
      INDENTED,
    );

    output = [...output, ...markLines(wrapped, LINE_MARKERS), ""];
  }

  // Arguments
  formatGroup("Arguments", helper.visibleArguments(cmd), (helper, argument) => {
    return formatItem(
      helper.argumentTerm(argument),
      helper.argumentDescription(argument),
      "command",
    );
  });

  const allOptions = helper.visibleOptions(cmd);
  const flags = allOptions.filter(isFlag);
  const required = allOptions.filter(isRequired);
  const optional = allOptions.filter(isOptional);

  // Options
  formatGroup("Required Options", required, (helper, option) => {
    return formatItem(
      helper.optionTerm(option),
      helper.optionDescription(option),
      computeKind(option.name()),
    );
  });

  formatGroup("Options", optional, (helper, option) => {
    return formatItem(
      helper.optionTerm(option),
      helper.optionDescription(option),
      computeKind(option.name()),
    );
  });

  formatGroup("Flags", flags, (helper, option) => {
    return formatItem(
      helper.optionTerm(option),
      helper.optionDescription(option),
      computeKind(option.name()),
    );
  });

  if (help.showGlobalOptions) {
    formatGroup(
      "Global Options",
      helper.visibleGlobalOptions(cmd),
      (helper, option) => {
        return formatItem(
          helper.optionTerm(option),
          helper.optionDescription(option),
          "global",
        );
      },
    );
  }

  // Commands
  formatGroup("Commands", helper.visibleCommands(cmd), (helper, cmd) => {
    return formatItem(
      helper.subcommandTerm(cmd),
      helper.subcommandDescription(cmd),
      "subcommand",
    );
  });

  if (chalk.level !== COLORS_OFF && seenKinds.size !== EMPTY_SIZE) {
    output.push("Legend");

    for (const kind of seenKinds) {
      output.push(styleFor(kind)("* " + KIND_DESCRIPTIONS[kind]));
    }
  }

  output.push(chalk.reset(""));

  return output.join("\n");

  function formatGroup<T>(
    title: string,
    items: T[],
    format: (helper: Help, value: T) => string,
    filter: (value: T) => boolean = (_: T) => true,
  ): void {
    const list = items.filter(filter);

    const formattedList = list.map((item) => format(help, item));

    if (isPresentArray(formattedList)) {
      output.push(`${title}:`, formatList(formattedList), "");
    }
  }
}

const COLORS_OFF: ColorSupportLevel = 0;

function isEmptyArray<T>(array: T[]): boolean {
  return array.length === EMPTY_SIZE;
}

function isPresentArray<T>(array: T[]): boolean {
  return !isEmptyArray(array);
}

export function defaultCommandSettings(command: Command): Command {
  return (
    command
      // .showHelpAfterError()
      .showSuggestionAfterError()
      .exitOverride((err) => {
        console.error(command.helpInformation());
        console.error(err);
      })
      .configureHelp({
        formatHelp: (cmd, helper) => {
          return formatHelp(helper, cmd, helper);
        },
      })
  );
}

function styleFor(kind: OptionKind) {
  switch (kind) {
    case "command":
      return chalk.green;
    case "query":
      return chalk.cyan;
    case "global":
      return chalk.yellow;
    case "subcommand":
      return chalk.magenta;
  }
}

type OptionKind = "command" | "query" | "global" | "subcommand";

const KIND_DESCRIPTIONS = {
  command: "Command-specific options",
  query: "Query command options",
  global: "Global options",
  subcommand: "Subcommands",
};

function computeKind(option: string): OptionKind {
  switch (option) {
    case "package":
    case "and":
    case "or":
    case "allow-draft":
    case "workspace-only":
      return "query";
    case "stylish":
    case "no-stylish":
    case "scripted":
    case "no-scripted":
    case "help":
    case "verbose":
    case "color":
    case "no-color":
      return "global";
    default:
      return "command";
  }
}

function isFlag(option: CommanderOption) {
  return option.required === false && option.optional === false;
}

function isRequired(option: CommanderOption) {
  return option.required === true;
}

function isOptional(option: CommanderOption) {
  return option.optional === true;
}

function markLines(
  lines: string,
  [start, end]: readonly [start: string, end: string],
) {
  const desc = lines.split("\n");
  const maxDescLength = Math.max(...desc.map((line) => line.trimEnd().length));

  return desc.map((line) => {
    return line.replace(/^(\s*)(.*?)(\s*)$/gm, (_, leading, mid) => {
      return chalk.gray(
        `${leading}${start}${mid}`.padEnd(maxDescLength + start.length) + end,
      );
    });
  });
}
