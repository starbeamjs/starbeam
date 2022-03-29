import { isTypeof } from "@starbeam/fundamental";
import { assert } from "./utils.js";

const SOURCE_PARTS =
  /^(?:(?<scope>@[^/\\]+)[/])?(?<name>[^/\\]+)(?:[/\\](?<path>.*))?$/;

type Package = { scope: string; name: string } | { name: string };

abstract class AbstractSourcePath {
  static parse(original: string): SourcePath | null {
    const match = original.match(SOURCE_PARTS);

    if (match === null || match.groups === undefined) {
      return null;
    }

    const { scope, name, path } = match.groups;

    if (typeof name !== "string") {
      return null;
    }

    // TODO: URLs
    if (scope) {
      return PathWithPackage.create({ scope: name, scopedName: name, path });
    } else if (name.startsWith(".")) {
      return path
        ? RelativePath.create(join(name, path))
        : RelativePath.create(path);
    } else {
      return PathWithPackage.create({
        scope: name,
        scopedName: path,
        path: null,
      });
    }
  }

  abstract readonly type: "package" | "relative";
  abstract readonly localPath: string | null;
  abstract readonly pkg: Package | null;

  get fullName(): string | null {
    if (!this.pkg) {
      return null;
    }

    if ("scope" in this.pkg) {
      return `${this.pkg.scope}/${this.pkg.name}`;
    } else {
      return this.pkg.name;
    }
  }

  isPackage(): this is PathWithPackage {
    return this.type === "package";
  }

  isRelative(): this is RelativePath {
    return this.type === "relative";
  }
}

class PathWithPackage extends AbstractSourcePath {
  static create({
    scope,
    scopedName: packageName,
    path,
  }: {
    scope: string | null;
    scopedName: string;
    path: string | null;
  }): PathWithPackage {
    return new PathWithPackage(scope, packageName, path);
  }

  readonly type = "package";

  readonly #scope: string | null;
  readonly #scopedName: string;
  readonly #path: string | null;

  private constructor(
    scope: string | null,
    scopedName: string,
    path: string | null
  ) {
    super();
    this.#scope = scope;
    this.#scopedName = scopedName;
    this.#path = path;
  }

  get scope(): string | null {
    return this.#scope;
  }

  get scopedName(): string {
    return this.#scopedName;
  }

  get pkg(): Package {
    if (this.#scope) {
      return { scope: this.#scope, name: this.#scopedName };
    } else {
      return { name: this.#scopedName };
    }
  }

  get fullName(): string {
    if (this.#scope) {
      return `${this.#scope}/${this.#scopedName}`;
    } else {
      return this.#scopedName;
    }
  }

  get localPath(): string | null {
    return this.#path;
  }
}

class RelativePath extends AbstractSourcePath {
  static create(path: string): RelativePath {
    return new RelativePath(path);
  }

  readonly type = "relative";

  readonly #path: string;

  private constructor(path: string) {
    super();
    this.#path = path;
  }

  get pkg(): null {
    return null;
  }

  get fullName(): null {
    return null;
  }

  get localPath(): string {
    return this.#path;
  }
}

export type SourcePath = PathWithPackage | RelativePath;

/**
 * The whole `Stack` system is only intended to be used for logging, so the
 * edge-cases where this normalization wouldn't work (verbatim paths on Windows)
 * shouldn't matter.
 */
function join(...pathParts: (string | null | undefined)[]): string {
  return pathParts
    .filter(isTypeof("string"))
    .map((p: string) => p.replaceAll(/[\\]/g, "/"))
    .join("/");
}

class Source {
  static of(original: string): Source {
    return new Source(original, AbstractSourcePath.parse(original));
  }

  readonly #original: string;
  readonly #sourcePath: SourcePath | null;

  constructor(original: string, path: SourcePath | null) {
    this.#original = original;
    this.#sourcePath = path;
  }

  get display(): string {
    return this.#original;
  }

  get sourcePath(): SourcePath | null {
    return this.#sourcePath;
  }

  get localPath(): string | null {
    return this.#sourcePath?.localPath ?? null;
  }

  isUnknown(): this is { sourcePath: null } {
    return this.#sourcePath === null;
  }

  isPackage(): this is { sourcePath: PathWithPackage } {
    return this.#sourcePath?.isPackage() ?? false;
  }

  isRelative(): this is { sourcePath: RelativePath } {
    return this.#sourcePath?.isRelative() ?? false;
  }

  /**
   * The name of the source's package, if available.
   */
  get fullName(): string | null {
    return this.#sourcePath?.fullName ?? null;
  }

  /**
   * The path inside the source package, if available and present.
   */
  get path(): string | null {
    return this.#sourcePath?.localPath ?? null;
  }

  get fullPath(): string | null {
    if (this.isPackage()) {
      return join(this.sourcePath?.fullName, this.#sourcePath?.localPath);
    } else if (this.isRelative()) {
      return join(this.sourcePath.localPath);
    } else {
      return null;
    }
  }
}

export class Action {
  static of(original: string): Action {
    return new Action(original);
  }

  readonly #original: string;

  constructor(original: string) {
    this.#original = original;
  }

  get original(): string {
    return this.#original;
  }

  get display(): string {
    return this.#original;
  }
}

const ANONYMOUS_FRAME = /^at (?<source>.*):(?<line>\d+):(?<column>\d+)$/;

interface FrameGroups {
  readonly source: string;
  readonly line: string;
  readonly column: string;
}

function isFrameGroups(
  groups: Record<string, unknown> | FrameGroups | undefined
): groups is FrameGroups {
  return (
    groups !== undefined &&
    typeof groups.source === "string" &&
    typeof groups.line === "string" &&
    typeof groups.column === "string"
  );
}

const NAMED_FRAME =
  /^at (?<name>.*) [(](?<source>.*):(?<line>\d+):(?<column>\d+)[)]$/;

interface NamedGroups {
  readonly name: string;
  readonly source: string;
  readonly line: string;
  readonly column: string;
}

function isNamedGroups(
  groups: Record<string, unknown> | NamedGroups | undefined
): groups is NamedGroups {
  return isFrameGroups(groups) && typeof groups.name === "string";
}

interface Parsed {
  readonly source: Source;
  readonly location: Location;
  readonly action: Action | null;
}

export abstract class Frame {
  static original(frame: Frame): string {
    return frame.#original;
  }

  static parse(original: string): Frame {
    const trimmed = original.trim();
    const named = NAMED_FRAME.exec(trimmed);

    if (named) {
      assert(
        isNamedGroups(named.groups),
        `Since the named frame regular expression (${NAMED_FRAME}) succeeded on the source line (${JSON.stringify(
          original
        )}), we expect the match object to have all of the named groups in it`
      );

      const { name, source, line, column } = named.groups;
      return FrameWithAction.create(original, {
        source,
        action: name,
        location: Location.create(Number(line), Number(column)),
      });
    }

    const anonymous = ANONYMOUS_FRAME.exec(original);

    if (anonymous) {
      assert(
        isFrameGroups(anonymous.groups),
        `Since the named frame regular expression (${ANONYMOUS_FRAME}) succeeded on the source line (${JSON.stringify(
          original
        )}), we expect the match object to have all of the frame groups in it`
      );

      const { source, line, column } = anonymous.groups;
      return FrameWithoutAction.create(original, {
        source,
        location: Location.create(Number(line), Number(column)),
      });
    }

    return UnknownFrame.create(original);
  }

  abstract get display(): string;

  readonly #original: string;

  protected constructor(original: string) {
    this.#original = original;
  }

  abstract get parsed(): Parsed | null;

  get package(): string | null {
    return this.parsed?.source.fullName ?? null;
  }

  /**
   * The source file or URL of the stack frame, if available.
   */
  get source(): string | null {
    return this.parsed?.source.path ?? null;
  }

  /**
   * The full path to the source, including the package name.
   */
  get fullPath(): string | null {
    return this.parsed?.source.fullPath ?? null;
  }

  /**
   * The path the source, relative to the package name.
   */
  get localPath(): string | null {
    return this.parsed?.source.localPath ?? null;
  }

  /**
   * The line and column of the stack frame, if available.
   */
  get location(): Location | null {
    return null;
  }

  /**
   * The function or method call that this stack frame corresponds to, if
   * available.
   */
  get action(): string | null {
    return null;
  }
}

export class Location {
  static create(line: number, column: number) {
    return new Location(line, column);
  }

  private constructor(readonly line: number, readonly column: number) {}

  get display(): string {
    return `${this.line}:${this.column}`;
  }
}

export abstract class KnownFrame extends Frame {
  readonly #source: Source;
  readonly #location: Location;

  protected constructor(original: string, source: Source, location: Location) {
    super(original);

    this.#source = source;
    this.#location = location;
  }

  get at(): string {
    return `${this.source}:${this.#location.line}:${this.#location.column}`;
  }

  get display(): string {
    return `at ${this.at}`;
  }

  get source(): string {
    return this.#source.display;
  }

  get location(): Location {
    return this.#location;
  }

  get parsed(): Parsed {
    return {
      source: this.#source,
      location: this.#location,
      action: null,
    };
  }
}

export class FrameWithAction extends KnownFrame {
  static create(
    original: string,
    {
      source,
      action,
      location,
    }: { source: string; action: string; location: Location }
  ): FrameWithAction {
    return new FrameWithAction(
      original,
      Source.of(source),
      Action.of(action),
      location
    );
  }

  readonly #action: Action;

  private constructor(
    original: string,
    source: Source,
    action: Action,
    location: Location
  ) {
    super(original, source, location);

    this.#action = action;
  }

  get display(): string {
    return `at ${this.action} (${this.at})`;
  }

  get action(): string {
    return this.#action.original;
  }

  get parsed(): Parsed {
    return {
      ...super.parsed,
      action: this.#action,
    };
  }
}

export class FrameWithoutAction extends KnownFrame {
  static create(
    original: string,
    { source, location }: { source: string; location: Location }
  ): FrameWithoutAction {
    return new FrameWithoutAction(original, Source.of(source), location);
  }

  get display(): string {
    return `at ${this.source}:${this.location.line}:${this.location.column}`;
  }
}

export class UnknownFrame extends Frame {
  static create(source: string, trimmed = source.trim()): UnknownFrame {
    return new UnknownFrame(source, source.trim());
  }

  readonly #trimmed: string;

  constructor(original: string, trimmed: string) {
    super(original);
    this.#trimmed = trimmed;
  }

  get display(): string {
    return this.#trimmed;
  }

  get parsed(): null {
    return null;
  }
}
