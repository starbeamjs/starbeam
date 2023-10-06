type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export interface CreateFsify {
  (options: Expand<Options>): Fsify;
}

export interface Fsify {
  (structure: Structure[]): Promise<ParsedStructure[]>;
  cleanup: () => Promise<void>;
}

export interface Options {
  /**
   * The root directory to install the directory structure into. Defaults to
   * the current working directory.
   */
  cwd?: string;
  /**
   * A persistent fsify tree remains on the file system after the process exits.
   * Defaults to true.
   */
  persistent?: boolean;
  /**
   * Allow deleting the current a directory that is or contains the current
   * working directory. Defaults to false.
   */
  force?: boolean;
}

export interface DirectoryStructure {
  type: "directory";
  name: string;
  contents: Structure[];
}

export interface ParsedDirectoryStructure extends DirectoryStructure {
  contents: ParsedStructure[];
  isDirectory: true;
  isFile: false;
}

export interface FileStructure {
  type: "file";
  name: string;
}

export interface ParsedFileStructure extends FileStructure {
  type: "file";
  name: string;
}

export interface LinkStructure {
  type: "link";
  name: string;
  target: string;
}

export interface ParsedLinkStructure extends LinkStructure {
  isDirectory: false;
  isFile: false;
}

export type Structure = DirectoryStructure | FileStructure | LinkStructure;
export type ParsedStructure =
  | ParsedDirectoryStructure
  | FileStructure
  | LinkStructure;

declare const DEFAULT: CreateFsify;
export default DEFAULT;
