declare class Paths {
  static empty(): Paths;
  static from(path: Iterable<Path>): Paths;

  glob(glob: string): Promise<Paths>;
  add(other: Path | Paths): Paths;
  file(relative: string): Paths;
  files(...relative: string[]): Paths;
  dir(...relative: string[]): Paths;

  watch(): Watcher;
}

declare class Path {
  readonly parent: Path;

  file(relative: string): Path;
  files(...relative: string[]): Paths;
  dir(...relative: string[]): Path;
  glob(glob: string): Promise<Paths>;
  contains(path: Path): boolean;

  watch(): Watcher;
}

type TODO = unknown;

declare class RelativePath {
  isDir(): boolean;
  isFile(): boolean;

  from(parent: Path): Path;
  parse(): TODO;
}

interface ParsedPath {
  /**
   * root is null when the path is relative
   */
  readonly root: string | null;
  readonly dirs: readonly string[];
  readonly file: ParsedFile | null;
}

interface AnyParsedAbsolute {
  readonly root: string;
}

interface ParsedFile {
  readonly dirs: readonly string[];
  readonly file: ParsedFile;
}

interface ParsedDirectory {
  readonly dirs: readonly string[];
}

type ParsedAbsolute<F extends ParsedFile | ParsedDirectory> =
  AnyParsedAbsolute & F;

interface ParsedFile {
  /**
   * base is `null` when the filename starts with an extension
   */
  readonly base: string | null;
  readonly ext: readonly string[];
}

declare abstract class ParsedDirectory {
  constructor(dirs: string[], original: Path | RelativePath);

  readonly segments: readonly Segment[];
}

declare class ParsedRelativeDirectory {
  static create(
    dirs: string[],
    original: RelativePath
  ): ParsedRelativeDirectory;

  isAncestor(): boolean;
  isDescendant(): boolean;
  isHere(): boolean;
}

interface AbstractSegment {
  readonly type: "parent" | "directory";
}

type Segment = AbstractParentSegment | AbstractDirectorySegment;

interface LocationInOriginal {
  readonly original: Path | RelativePath;
  // TODO: Add location support
  readonly location?: [start: number, end: number];
}

/**
 * Represents `..`
 */
interface AbstractParentSegment extends AbstractSegment {
  readonly type: "parent";
}

interface AbstractDirectorySegment extends AbstractSegment {
  readonly type: "directory";
  readonly name: string;
}

declare class RootNode {
  readonly children: readonly PathNode[];
}

declare class DirectoryNode {
  readonly name: string;
  readonly children: readonly PathNode[];
}

declare class FileNode {
  readonly name: string | null;
  readonly ext: readonly string[];

  readonly filename: string;
}

type PathNode = DirectoryNode | FileNode;

interface DirectoriesJSON {
  [key: string]: ParentJSON;
}

type ParentJSON = string[] | [dirs: DirectoriesJSON, ...files: string[]];
