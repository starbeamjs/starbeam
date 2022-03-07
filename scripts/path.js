// @ts-check

/// <reference path="./_path.d.ts" />

import FastGlob from "fast-glob";
import path, {
  dirname,
  isAbsolute,
  normalize,
  parse,
  relative,
  resolve,
} from "path";
import { fileURLToPath } from "url";
import * as util from "util";
import Watcher from "watcher";

export const INSPECT = Symbol.for("nodejs.util.inspect.custom");

class Parent {
  #children;

  /**
   * @param {Map<string, PathNode>} children
   */
  constructor(children) {
    this.#children = children;
  }

  get children() {
    return [...this.#children.values()];
  }

  /**
   * @param {string} name
   * @param {*} node
   */
  set(name, node) {
    this.#children.set(name, node);
  }

  /**
   * @param {string} name
   * @param {Path} original
   * @returns {DirectoryNode}
   */
  dir(name, original) {
    const child = this.#children.get(name);

    if (child) {
      if (child instanceof DirectoryNode) {
        return child;
      } else {
        throw Error(
          `You cannot add the same path as both a file and directory. The path in question is ${PathImpl.getFilename(
            original
          )}`
        );
      }
    }

    const dir = DirectoryNode.create(name);
    this.#children.set(name, dir);
    return dir;
  }

  /**
   * @param {string} filename
   * @param {ParsedFile} file
   * @param {Path} original
   */
  file(filename, file, original) {
    const child = this.#children.get(filename);

    if (child) {
      if (child instanceof FileNode) {
        return child;
      } else {
        throw Error(
          `You cannot add the same path as both a file and directory. The path in question is ${PathImpl.getFilename(
            original
          )}`
        );
      }
    }

    const fileNode = FileNode.create(file.base, file.ext);
    this.#children.set(filename, fileNode);

    return fileNode;
  }

  /**
   * @returns {ParentJSON}
   */
  toJSON() {
    /** @type {string[]} */
    const files = [];
    /** @type {DirectoriesJSON} */
    const dirs = {};

    for (const [key, value] of this.#children) {
      if (value instanceof FileNode) {
        files.push(key);
      } else if (value instanceof DirectoryNode) {
        dirs[key] = value.toJSON();
      }
    }

    if (Object.keys(dirs).length > 0) {
      return [dirs, ...files];
    } else {
      return files;
    }
  }
}

export class Root extends Parent {
  /**
   * @param {Path} path
   */
  static create(path) {
    return new Root(path, new Map());
  }

  #root;

  /**
   * @param {Path} root
   * @param {Map<string, PathNode>} children
   */
  constructor(root, children) {
    super(children);
    this.#root = root;
  }

  /**
   * @param {Path} path
   */
  add(path) {
    if (!this.#root.contains(path)) {
      throw Error(
        `You cannot add a path to a root unless the root contains the path. You attempted to add ${PathImpl.getFilename(
          path
        )} to root ${PathImpl.getFilename(this.#root)}`
      );
    }

    const parsed = this.#root.relativeTo(path).parse();

    /** @type {Parent} */
    let current = this;

    for (const dir of parsed.dirs) {
      if (dir.type === "parent") {
        throw Error(
          `TODO: Split ParsedPath so that Path#parse() doesn't seem to support parent segments`
        );
      }

      current = current.dir(dir.name, path);
    }

    const { file, filename } = parsed;

    if (file && filename) {
      current.file(filename, file, path);
    }
  }

  /**
   * @param {Path} path
   */
  contains(path) {
    let parsed = path.parse();
  }
}

export class DirectoryNode extends Parent {
  /**
   * @param {string} name
   */
  static create(name) {
    return new DirectoryNode(name, new Map());
  }

  #name;
  #children;

  /**
   *
   * @param {string} name
   * @param {Map<string, PathNode>} children
   */
  constructor(name, children) {
    super(children);
    this.#name = name;
    this.#children = children;
  }

  get name() {
    return this.#name;
  }
}

export class FileNode {
  /**
   *
   * @param {string | null} base
   * @param {readonly string[]} ext
   */
  static create(base, ext) {
    return new FileNode(base, ext);
  }

  #base;
  #ext;

  /**
   *
   * @param {string | null} base
   * @param {readonly string[]} ext
   */
  constructor(base, ext) {
    this.#base = base;
    this.#ext = ext;
  }

  get name() {
    return this.#base;
  }

  get ext() {
    return this.#ext;
  }

  get filename() {
    if (this.#base === null) {
      return `.${this.#ext.join(".")}`;
    } else {
      return `${this.#base}.${this.#ext.join(".")}`;
    }
  }

  toJSON() {
    return { filename: this.filename };
  }
}

/** @implements {Paths} */
export class PathsImpl {
  /**
   * @returns {Paths}
   */
  static empty() {
    return new PathsImpl(new Map());
  }

  /**
   * @param {Iterable<Path>} paths
   * @returns {Paths}
   */
  static from(paths) {
    /** @type {Map<string, PathImpl>} */
    let map = new Map();

    for (let path of paths) {
      map.set(PathImpl.getFilename(path), path);
    }

    return new PathsImpl(map);
  }

  #paths;

  constructor(/** @type {Map<string, PathImpl>} */ paths) {
    this.#paths = paths;
  }

  tree() {
    let map = new Map();
  }

  /**
   *
   * @param {Path} target
   * @returns {Path}
   */
  hasDescendant(target) {
    return this.#find((path) => path.contains(target));
  }

  /**
   * @param {import("fast-glob").Pattern | import("fast-glob").Pattern[]} glob
   * @returns {Promise<Paths>}
   */
  async glob(glob) {
    /** @type {Paths} */
    let newPaths = Paths.empty();

    for (let path of this.#paths.values()) {
      const paths = impl(await path.glob(glob));
      newPaths = newPaths.add(paths);
    }

    return PathsImpl.from(paths);
  }

  /**
   * @param {PathImpl | Paths} other
   * @returns {Paths}
   */
  add(other) {
    if (other instanceof PathImpl) {
      return PathsImpl.from([...this, other]);
    } else {
      const paths = [...this, ...other];
      return PathsImpl.from(paths);
    }
  }

  /**
   *
   * @param {string} relative
   * @returns {Paths}
   */
  file(relative) {
    return this.#map((path) => path.file(relative));
  }

  /**
   * @param  {string[]} relative
   * @returns {Paths}
   */
  files(/** @type {string[]} */ ...relative) {
    return this.#flatMap((path) => path.files(...relative));
  }

  /**
   * @param  {string[]} relative
   * @returns {Paths}
   */
  dir(/** @type {string[]} */ ...relative) {
    return this.#map((path) => path.dir(...relative));
  }

  /**
   * @returns {Watcher}
   */
  watch() {
    return new Watcher([...this].map(PathImpl.getFilename));
  }

  [INSPECT]() {
    return new Set([...this.#paths.values()]);
  }

  /**
   * @param {(path: PathImpl) => Paths} callback
   */
  #flatMap(callback) {
    /** @type {Map<string, PathImpl>} */
    let map = new Map();

    for (let path of this.#paths.values()) {
      let paths = callback(path);

      for (let path of paths) {
        map.set(PathImpl.getFilename(path), path);
      }
    }

    return new PathsImpl(map);
  }

  /**
   * @param {(path: PathImpl) => Path} callback
   */
  #map(callback) {
    return PathsImpl.from([...this].map(callback));
  }

  /**
   * @param {(path: Path) => boolean} callback
   */
  #find(callback) {
    return [...this].find(callback);
  }

  [Symbol.iterator]() {
    return this.#paths.values();
  }
}

/** @type import("fast-glob").Options */
const GLOB_OPTIONS = {
  absolute: true,
  onlyDirectories: false,
  onlyFiles: false,
  markDirectories: true,
};

class ParsedAbsolute {
  /**
   * @param {import("path").ParsedPath} parsed
   * @param {Path} original
   */
  static parts(parsed, original) {
    if (!parsed.root) {
      throw Error(
        `UNEXPECTED: AnyParsedAbsolute.parts was called with no parsed.root, but the parts were constructed from path.parse(${util.inspect(
          path,
          { colors: true }
        )}), which is supposed to be an absolute path`
      );
    }

    return new ParsedAbsolute(parsed.root, original);
  }

  #root;
  #original;

  /**
   * @param {string} root
   * @param {Path} original
   */
  constructor(root, original) {
    this.#root = root;
    this.#original = path;
  }
}

class ParsedFile {
  /**
   * @param {import("path").ParsedPath} parsed
   * @param {PathImpl | RelativePath} original
   */

  static parts(parsed, original) {
    if (!parsed.base) {
      throw Error(
        `UNEXPECTED: Parts.parts was called with no parsed.base, but the parts were constructed from path.parse(${util.inspect(
          path,
          { colors: true }
        )}), which is supposed to be a file`
      );
    }

    const { base, ext } = parseFile(parsed.base);
    return new ParsedFile(base, ext, original);
  }

  #base;
  #ext;
  #original;

  /**
   *
   * @param {string | null} base
   * @param {readonly string[]} ext
   * @param {PathImpl | RelativePath} original
   */
  constructor(base, ext, original) {
    this.#base = base;
    this.#ext = ext;
    this.#original = original;
  }

  /**
   * `base` is null if the file starts with `.`
   *
   * @returns {string | null}
   */
  get base() {
    return this.#base;
  }

  get ext() {
    return this.#ext;
  }

  get filename() {
    const { base, ext } = this;

    if (ext.length) {
      return `${base}.${ext.join(".")}`;
    } else {
      return base;
    }
  }

  /**
   *
   * @param {string | { exact: string }} [ext]
   * @returns
   */
  hasFileExtension(ext) {
    if (this.ext.length === 0) {
      return false;
    }

    if (ext === undefined) {
      return true;
    }

    /** @type {string} */
    let specifiedExt = typeof ext === "string" ? ext : ext.exact;
    /** @type {boolean} */
    let exact = typeof ext === "string" ? false : true;

    const normalizedExt = specifiedExt.startsWith(".")
      ? specifiedExt.slice(1)
      : specifiedExt;

    const thisExt = this.ext.join(".");

    if (thisExt === ext) {
      return true;
    }

    if (!exact) {
      return thisExt.endsWith(`.${ext}`);
    }
  }

  get extension() {
    if (this.hasFileExtension()) {
      return this.#ext.join(".");
    } else {
      return null;
    }
  }
}

/** @implements {ParsedDirectory} */
class ParsedDirectoryImpl {
  /**
   *
   * @param {string[]} dirs
   * @param {Path | RelativePath} original
   * @returns
   */
  static create(dirs, original) {
    return new ParsedDirectoryImpl(dirs, original);
  }

  #dirs;
  #original;

  /**
   *
   * @param {string[]} dirs
   * @param {Path | RelativePath} original
   */
  constructor(dirs, original) {
    this.#dirs = dirs;
    this.#original = original;
  }

  /**
   * @returns {readonly string[]}
   */
  get dirs() {
    return this.#dirs;
  }

  get segments() {
    return this.#dirs.map(Segment);
  }
}

class ParsedAbsoluteDirectory extends ParsedDirectoryImpl {
  /** @type {ParsedAbsolute} */
  #root;

  /**
   * @param {string} root
   * @param {string[]} dirs
   * @param {Path} original
   */
  constructor(root, dirs, original) {
    super(dirs, original);
    this.#root = new ParsedAbsolute(root, original);
  }
}

/** @implements {ParsedRelativeDirectory} */
class ParsedRelativeDirectoryImpl {
  /**
   * @param {string[]} dirs
   * @param {RelativePath} original
   * @returns {ParsedRelativeDirectory}
   */
  static create(dirs, original) {
    return new ParsedRelativeDirectoryImpl(
      ParsedDirectoryImpl.create(dirs, original),
      original
    );
  }

  #parsed;
  #original;

  /**
   *
   * @param {ParsedDirectory} parsed
   * @param {RelativePath} original
   */
  constructor(parsed, original) {
    this.#parsed = parsed;
    this.#original = original;
  }

  isAncestor() {
    return this.#parsed.segments.every((dir) => dir.type === "parent");
  }

  isDescendant() {
    if (this.isHere()) {
      return false;
    }

    return (
      this.#parsed.dirs.length === 0 ||
      this.#parsed.segments[0].type !== "parent"
    );
  }

  isHere() {
    return this.#parsed.dirs.length === 0;
  }
}

// export class ParsedAbsolutePath {
//   /**
//    * @param {Path} file
//    * @returns {ParsedAbsolute<ParsedFile>}
//    */
//   static file(file) {}

//   /**
//    *
//    * @param {string | null} root
//    * @param {readonly PathSegment[]} dirs
//    * @param {ParsedFile | null} file
//    */
//   static create(root, dirs, file) {
//     return new ParsedPath(root, dirs, file);
//   }

//   #root;
//   #dirs;
//   #file;

//   /**
//    * @private
//    *
//    * @param {string | null} root
//    * @param {readonly PathSegment[]} dirs
//    * @param {ParsedFile | null} file
//    */
//   constructor(root, dirs, file) {
//     this.#root = root;
//     this.#dirs = dirs;
//     this.#file = file;
//   }

//   get root() {
//     return this.#root;
//   }

//   get dirs() {
//     return this.#dirs;
//   }

//   get file() {
//     return this.#file;
//   }

//   isAbsolute() {
//     return this.#root !== null;
//   }

//   isRelative() {
//     return !this.isAbsolute();
//   }

//   isDirectory() {
//     return this.#file === null && (this.#root || this.#dirs.length > 0);
//   }

//   isRoot() {
//     return this.#root && this.#dirs.length === 0 && this.#file === null;
//   }

//   isFile() {
//     return this.#file !== null;
//   }

//   get filename() {
//     if (this.#file === null) {
//       return null;
//     } else {
//       let { base, ext } = this.#file;

//       if (ext.length) {
//         return `${base}.${ext.join(".")}`;
//       } else {
//         return base;
//       }
//     }
//   }

//   hasFileExtension(/** @type {string} */ ext) {
//     ext = ext.startsWith(".") ? ext.slice(1) : ext;
//     const thisExt = this.extension;

//     if (thisExt === null) {
//       return false;
//     }

//     return thisExt === ext || thisExt.endsWith(ext);
//   }

//   hasExactFileExtension(/** @type {string} */ ext) {
//     ext = ext.startsWith(".") ? ext.slice(1) : ext;
//     const thisExt = this.extension;

//     if (thisExt === null) {
//       return false;
//     }

//     return ext === thisExt;
//   }

//   get extension() {
//     if (!this.#file) {
//       return null;
//     }

//     return this.#file.ext.join(".");
//   }

//   isAncestor() {
//     return (
//       this.isRelative() &&
//       this.isDirectory() &&
//       this.#dirs.every((dir) => dir.type === "parent")
//     );
//   }

//   isDescendant() {
//     if (this.isAbsolute() || this.isHere()) {
//       return false;
//     }

//     return (
//       this.isRelative() &&
//       (this.#dirs.length === 0 || this.#dirs[0].type !== "parent")
//     );
//   }

//   isHere() {
//     return this.isRelative() && this.#dirs.length === 0 && this.#file === null;
//   }

//   get parts() {
//     return {
//       root: this.#root,
//       dirs: this.#dirs,
//       file: this.#file,
//     };
//   }

//   [INSPECT](
//     /** @type {unknown} */ ctx,
//     /** @type {import("util").InspectOptionsStylized} */ options
//   ) {
//     const { stylize } = options;

//     /** @type {string[]} */
//     const parts = [];

//     /** @type {string | null} */
//     let root = null;

//     if (this.#root) {
//       root = stylize(this.#root, "symbol");
//     }

//     if (this.#dirs.length > 0) {
//       for (let dir of this.#dirs) {
//         if (dir.type === "parent") {
//           parts.push(stylize("..", "special"));
//         } else {
//           parts.push(stylize(dir.name, "string"));
//         }
//       }
//     }

//     if (this.#file) {
//       const { base, ext } = this.#file;

//       /** @type string[] */
//       const fileParts = [base === null ? "." : stylize(base, "number")];
//       fileParts.push(...ext.map((e) => stylize(e, "regexp")));

//       parts.push(fileParts.join("."));
//     }

//     /** @type {string} */
//     let type;

//     if (this.isAbsolute()) {
//       type = this.isDirectory() ? "AbsoluteDir" : "AbsoluteFile";
//     } else {
//       type = this.isDirectory() ? "RelativeDir" : "RelativeFile";
//     }

//     let filename = parts.join("/");
//     if (root) {
//       filename = `${root}${filename}`;
//     }

//     return `${type}(${filename})`;
//   }
// }

/**
 * @implements {RelativePathImpl}
 */
export class RelativePathImpl {
  /**
   *
   * @param {string} filename
   * @returns {RelativePath}
   */
  static file(filename) {
    if (isAbsolute(filename)) {
      throw Error(
        `The path passed to RelativePath.file must be a relative path. You passed ${filename}`
      );
    }

    if (filename.endsWith("/")) {
      throw Error(
        `The filename passed to RelativePath.file must not have a trailing '/' (did you mean \`RelativePath.dir\`?)`
      );
    }

    return new RelativePathImpl(filename, false);
  }

  /**
   *
   * @param {string} filename
   * @returns {RelativePath}
   */
  static dir(filename) {
    if (isAbsolute(filename)) {
      throw Error(
        `The path passed to RelativePath.dir must be a relative path. You passed ${filename}`
      );
    }

    return new RelativePathImpl(
      filename.endsWith("/") ? filename.slice(0, -1) : filename,
      true
    );
  }

  /**
   * @param {RelativePath} path
   * @returns {string}
   */
  static getPath(/** @type {RelativePathImpl} */ path) {
    return path.#filename;
  }

  #filename;
  #isDir;

  /**
   *
   * @param {string} path
   * @param {boolean} isDir
   */
  constructor(path, isDir) {
    this.#filename = path;
    this.#isDir = isDir;
  }

  get #segments() {
    return path.normalize(this.#filename);
  }

  isDir() {
    return this.#isDir;
  }

  isFile() {
    return !this.#isDir;
  }

  /**
   * @param {Path} parent
   * @returns {Path}
   */
  from(parent) {
    if (this.#isDir) {
      return parent.dir(this.#filename);
    } else {
      return parent.file(this.#filename);
    }
  }

  /**
   *
   * @returns {unknown}
   */
  parse() {
    const parts = parse(this.#filename);

    // return { ...parts, isDir: this.#isDir };
    return normalizeParse(null, parts.dir, parts.base, this.isDir());
  }

  [INSPECT](
    /** @type {unknown} */ ctx,
    /** @type {import("util").InspectOptionsStylized} */ options
  ) {
    const { stylize } = options;

    if (this.#filename.endsWith("/")) {
      return `Dir(${stylize(this.#filename.slice(0, -1), "special")})`;
    } else {
      return `File(${stylize(this.#filename, "special")})`;
    }
  }
}

/** @implements {Path} */
export class PathImpl {
  static here(/** @type {ImportMeta} */ importMeta) {
    return PathImpl.file(fileURLToPath(importMeta.url));
  }

  static file(/** @type {string} */ file) {
    if (file.endsWith("/")) {
      throw Error(
        `You must not pass a path that ends with '/' to \`Path.file()\`. Did you mean \`Path.dir()\`?`
      );
    }

    return PathImpl.#checked(file, "Path.file");
  }

  static dir(/** @type {string} */ dir) {
    return PathImpl.#checked(dir.endsWith("/") ? dir : `${dir}/`, "Path.dir");
  }

  /**
   * @param {string} path
   * @param {string} from
   * @returns
   */
  static #checked(path, from) {
    const parsed = parse(path);

    if (
      /^[.]|[/\\][.]+[/]|[/\\][.]+$/.test(parsed.dir) ||
      parsed.base === "." ||
      parsed.base === ".."
    ) {
      throw Error(
        `You must not include segments that contain only \`.\`s in paths passed to ${from}. You passed ${path}.`
      );
    }

    if (/[/](?=[/])/.test(path)) {
      throw Error(
        `You must not include adjacent path separators in paths passed to ${from}. you passed ${path}`
      );
    }

    const normalized = normalize(path);

    if (!isAbsolute(normalized)) {
      throw Error(
        `You must pass an absolute path to ${from}. You passed ${path}`
      );
    }

    return new PathImpl(normalize(path));
  }

  /**
   * @param {Path} path
   * @returns
   */
  static getFilename(path) {
    return impl(path).#filename;
  }

  #filename;

  constructor(/** @type {string} */ file) {
    this.#filename = file;
  }

  parse() {
    const parsed = parse(this.#filename);

    let dir = parsed.dir;

    /** @type {string | null} */
    let root;

    if (parsed.root === "") {
      root = null;
    } else {
      root = parsed.root;
      if (parsed.dir.startsWith(root)) {
        dir = dir.slice(parsed.root.length);
      }
    }

    return normalizeParse(root, dir, parsed.base, this.isDir());
  }

  /**
   * @param {Path} path
   */
  contains(path) {
    return this.relativeTo(path).parse().isDescendant();
  }

  isDir() {
    return this.#filename.endsWith("/");
  }

  isFile() {
    return !this.isDir();
  }

  /**
   *
   * @param {Path} other
   * @returns {RelativePath}
   */
  relativeTo(other) {
    if (!other || !(other instanceof PathImpl)) {
      throw Error(
        `You must pass a Path to relativeTo. You passed ${util.inspect(other)}`
      );
    }

    const relativePath = relative(this.#filename, other.#filename);

    if (other.isDir()) {
      return RelativePathImpl.dir(relativePath);
    } else {
      return RelativePathImpl.file(relativePath);
    }
  }

  /**
   *
   * @param {string} relative
   * @returns {Path}
   */
  file(relative) {
    return type(PathImpl.file(resolve(this.#filename, relative)));
  }

  /**
   *
   * @param  {string[]} relative
   * @returns {Paths}
   */
  files(...relative) {
    return PathsImpl.from(relative.map((file) => this.file(file)));
  }

  /**
   *
   * @param  {string[]} relative
   * @returns {Path}
   */
  dir(/** @type {string[]} */ ...relative) {
    return PathImpl.dir(resolve(this.#filename, ...relative));
  }

  /**
   * @param {import("fast-glob").Pattern | import("fast-glob").Pattern[]} glob
   * @returns {Promise<Paths>}
   */
  async glob(glob) {
    let globs = (Array.isArray(glob) ? glob : [glob]).map(
      (g) => `${this.#filename}/${g}`
    );

    let files = await FastGlob(glob, GLOB_OPTIONS);
    return PathsImpl.from(files.map((file) => PathImpl.file(file)));
  }

  /**
   * @returns {Path}
   */
  get parent() {
    return type(PathImpl.dir(dirname(this.#filename)));
  }

  /**
   * @returns {Watcher}
   */
  watch() {
    return new Watcher(this.#filename);
  }

  [INSPECT](
    /** @type {unknown} */ ctx,
    /** @type {import("util").InspectOptionsStylized} */ options
  ) {
    const { stylize } = options;

    if (this.#filename.endsWith("/")) {
      return `Dir(${stylize(this.#filename.slice(0, -1), "special")})`;
    } else {
      return `File(${stylize(this.#filename, "special")})`;
    }
  }
}

function normalizeParse(
  /** @type {string | null} */ root,
  /** @type {string} */ dir,
  /** @type {string} */ filename,
  /** @type {boolean} */ isDir
) {
  let segments = dir.length === 0 ? [] : dir.split(path.sep).map(Segment);

  /** If the file is a directory, the file component is just another directory */
  if (isDir && filename.length > 0) {
    segments.push(Segment(filename));
    return root === null ? ParsedPath.create(root, segments, null) : null;
  } else {
    /** @type {ParsedFile | null} */
    let file;

    if (filename === "") {
      file = null;
    } else {
      file = parseFile(filename);
    }

    return ParsedPath.create(root, segments, file);
  }
}

/** @implements {AbstractParentSegment} */
class ParentSegment {
  /** @readonly */
  type = "parent";
}

/** @implements {AbstractDirectorySegment} */
class DirectorySegment {
  /**
   * @param {string} segment
   * @returns
   */
  static segment(segment) {
    return new DirectorySegment(segment);
  }

  /** @readonly */
  type = "directory";

  #segment;

  #original;
  #location;
  // TODO: original + location

  /**
   * @param {string} segment
   * @param {LocationInOriginal} original
   */
  constructor(segment, original) {
    this.#segment = segment;
  }
}

/**
 * @param {string} segment
 * @returns {PathSegment}
 */
function Segment(segment) {
  if (segment === "..") {
    return { type: "parent" };
  } else {
    return { type: "directory", name: segment };
  }
}

/**
 * @param {string} filename
 * @returns {ParsedFile}
 */
function parseFile(filename) {
  if (filename === "" || filename === "." || filename === "..") {
    throw Error(`Invalid filename ${filename} passed to parseFile`);
  }

  if (filename.startsWith(".")) {
    const ext = filename.slice(1).split(".");
    return { base: null, ext };
  } else {
    const [base, ...ext] = filename.split(".");
    return { base, ext };
  }
}

/**
 * @template P {Path | Paths}
 * @param {P} type
 * @returns {P extends Path ? PathImpl : P extends Paths ? PathsImpl : never}
 */
function impl(type) {
  return /** @type {any} */ (type);
}

/**
 * @template P {PathImpl | PathsImpl}
 * @param {P} impl
 * @returns {P extends PathImpl ? Path : P extends PathsImpl ? Paths : never}
 */

function type(impl) {
  return /** @type {any} */ (impl);
}
