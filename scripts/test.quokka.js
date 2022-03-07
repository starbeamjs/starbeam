// @ts-check

import path from "path";
import { PathImpl, Root } from "./path.js";

const p = PathImpl.file("/etc"); //?

// p.contains(Path.file("/etc/hosts")); //?
// p.contains(Path.dir("/etc/lol/lol")); //?

path.parse("/foo/.."); //?

path.win32.parse("foo\\bar\\../baz/bat"); //?

path.parse(""); //?
PathImpl.dir("/foo/bar/baz").relativeTo(PathImpl.dir("/foo/bar/baz")).parse(); //?
PathImpl.dir("/foo/bar/baz").relativeTo(PathImpl.dir("/foo/bar/baz")).parse()
  .parts; //?
PathImpl.dir("/foo/bar/baz").contains(PathImpl.dir("/foo/bar")); //?
const relative = PathImpl.dir("/foo/bar/baz/").relativeTo(
  PathImpl.dir("/foo/bar")
); //?
const parsed = relative.parse(); //?
parsed.isRelative(); //?
parsed.parts; //?
parsed.parts.dirs[0].type; //?

const root = Root.create(PathImpl.dir("/"));
root.add(PathImpl.dir("/etc"));
root.add(PathImpl.dir("/etc/resolv.d"));
root.add(PathImpl.file("/etc/passwd"));
root.add(PathImpl.file("/etc/resolv.d/foo.dns"));

console.log(root.toJSON());
console.log(JSON.stringify(root, null, 2));
