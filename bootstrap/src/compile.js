import { diff } from "fast-array-diff";
import searchGlob from "fast-glob";
import * as fs from "fs/promises";
import * as path from "path";
import { isAbsolute } from "path";
import { PromiseReadable } from "promise-readable";
import sh from "shell-escape-tag";
import shell from "shelljs";
import * as util from "util";
export const INSPECT = Symbol.for("nodejs.util.inspect.custom");
export class Workspace {
    /**
     * @param root the root of the workspace, as an absolute directory
     */
    static async create(root, namespace) {
        let paths = await workspacePackages(root, namespace);
        let packages = await Promise.all(paths.map(async (packageRoot) => {
            let manifest = path.resolve(packageRoot, "package.json");
            let buf = await fs.readFile(manifest, { encoding: "utf8" });
            let json = JSON.parse(buf);
            let root = path.dirname(manifest);
            let name = path.basename(root);
            return Package.create(() => workspace, name, json);
        }));
        const workspace = new Workspace(root, namespace, packages);
        return workspace;
    }
    /**
     * The npm namespace (e.g. the #namespace of `@starbeam/core` is `@starbeam`)
     */
    #namespace;
    /**
     * The root of the workspace, as an absolute directory
     */
    #root;
    #packages;
    constructor(root, namespace, packages) {
        this.#root = root;
        this.#namespace = namespace;
        this.#packages = packages;
    }
    get root() {
        return this.#root;
    }
    get packages() {
        return this.#packages;
    }
    get namespace() {
        return this.#namespace;
    }
}
class Package {
    static create(workspace, name, manifest) {
        return new Package(workspace, name, manifest);
    }
    /**
     * The workspace that this package belongs to. It's a thunk because workspaces
     * and packages are cyclic and have to be initialized together.
     */
    #workspaceThunk;
    /**
     * The name of the package. For example, `#name` of `@starbeam/core` is `core`
     */
    #localName;
    /**
     * The parsed package.json
     */
    #manifest;
    constructor(workspace, name, manifest) {
        this.#workspaceThunk = workspace;
        this.#localName = name;
        this.#manifest = manifest;
    }
    get #workspace() {
        return this.#workspaceThunk();
    }
    get name() {
        return `${this.#workspace.namespace}/${this.#localName}`;
    }
    /**
     * The root of this package, which contains the package.json
     */
    get root() {
        return AbsolutePath.directory(path.resolve(this.#workspace.root, this.#workspace.namespace, this.#localName));
    }
    get packageJSON() {
        return path.resolve(this.#workspace.root);
    }
    async compile() {
        // let root = this.root;
        // let dist = path.join(this.root, "dist");
        let transpilation = await this.#packageTranspilation();
        let diff = transpilation.diff(logged(await this.#getDistFiles(), "this.#getDistFiles"));
        log(diff);
        // for (let task of files) {
        //   // console.log(task);
        // }
        // let files = await glob(`${root}/!(node_modules)**/*.ts`);
        // // console.log({ files });
        // for (let file of files) {
        //   if (file.endsWith(".d.ts")) {
        //     console.warn(
        //       `Unexpected .d.ts file found during compilation (${file})`
        //     );
        //     continue;
        //   }
        //   let relative = path.relative(root, file);
        //   let output = await swc.transformFile(file, {
        //     sourceMaps: "inline",
        //     inlineSourcesContent: true,
        //     jsc: {
        //       parser: {
        //         syntax: "typescript",
        //         decorators: true,
        //       },
        //       target: "es2022",
        //     },
        //   });
        //   let target = changeExtension(`${dist}/${relative}`, "js");
        //   shell.mkdir("-p", path.dirname(target));
        //   fs.writeFile(target, output.code);
        // }
    }
    get #dist() {
        return this.root.directory("dist");
    }
    async #packageTranspilation() {
        let files = await AbsolutePaths.glob(`!(node_modules)**/*.ts`, this.root);
        let dts = files.filter((file) => file.hasExactExtension("d.ts"));
        for (let file of dts) {
            console.warn(`Unexpected .d.ts file found during compilation (${file})`);
        }
        let ts = files
            .filter((file) => file.hasExactExtension("ts"))
            .filter((file) => file.eq(this.root));
        return Transpilation.create(ts.mapArray((file) => this.#fileTranspilation(file)));
        // let files = await glob(`${this.root}/!(node_modules)**/*.ts`);
        // for (let file of files) {
        //   if (file.endsWith(".d.ts")) {
        //     console.warn(
        //       `Unexpected .d.ts file found during compilation (${file})`
        //     );
        //   }
        // }
        // let tasks = files
        //   .filter((file) => !file.startsWith(this.#dist))
        //   .filter((file) => !file.endsWith(".d.ts"))
        //   .map((file) => this.#fileTranspilation(file));
        // return Transpilation.create(tasks);
    }
    async #getDistFiles() {
        return this.#dist.glob("**", { kind: "all" });
    }
    #fileTranspilation(inputPath) {
        let relativePath = inputPath.relativeFromAncestor(this.root);
        let output = this.#dist.file(relativePath).changeExtension("js");
        // console.log({ relativePath, output });
        return TranspileTask.create(inputPath, output);
    }
}
class Transpilation {
    static create(tasks) {
        return new Transpilation(tasks);
    }
    #tasks;
    constructor(tasks) {
        this.#tasks = tasks;
    }
    diff(existing) {
        return existing.diffByKind(this.outputPaths);
    }
    get outputPaths() {
        let files = AbsolutePaths.from(this.#tasks.map((task) => task.output));
        let directories = files.directory;
        return files.merge(directories);
    }
}
class Mappable {
    filter(filter) {
        return this.map((single) => (filter(single) ? single : null));
    }
    mapArray(mapper) {
        return this.reduce((array, item) => array.push(mapper(item)), [], "mutate");
    }
}
class AbsolutePaths extends Mappable {
    static empty() {
        return new AbsolutePaths(new Map());
    }
    static async all(inside, options = { kind: "regular" }) {
        return AbsolutePaths.glob("**", inside, options);
    }
    static async glob(glob, inside, { kind } = {
        kind: "regular",
    }) {
        let fullGlob = path.resolve(AbsolutePath.getFilename(inside), glob);
        return AbsolutePaths.#glob(fullGlob, kind);
    }
    static async #glob(glob, kind) {
        switch (kind) {
            case "directory": {
                return AbsolutePaths.marked(await searchGlob(glob, {
                    markDirectories: true,
                    onlyDirectories: true,
                }));
            }
            case "regular": {
                return AbsolutePaths.marked(await searchGlob(glob, {
                    onlyFiles: true,
                }));
            }
            case "all": {
                return AbsolutePaths.marked(await searchGlob(glob, {
                    onlyFiles: false,
                    onlyDirectories: false,
                    markDirectories: true,
                }));
            }
            default: {
                exhaustive(kind, "kind");
            }
        }
    }
    static from(paths) {
        let set = AbsolutePaths.empty();
        for (let path of paths) {
            set.add(AbsolutePath.from(path));
        }
        return set;
    }
    static marked(paths) {
        let set = AbsolutePaths.empty();
        set.add([...paths].map(AbsolutePath.marked));
        return set;
    }
    #paths;
    constructor(paths) {
        super();
        this.#paths = paths;
    }
    clone() {
        return new AbsolutePaths(new Map(this.#paths));
    }
    get size() {
        return this.#paths.size;
    }
    get regularFiles() {
        return this.map((path) => (path.isRegularFile ? path : null));
    }
    get directories() {
        return this.map((path) => (path.isDirectory ? path : null));
    }
    /**
     * Map each path in this set:
     *
     * - if it's a directory, leave it alone
     * - if it's a regular file, get the file's directory
     */
    get directory() {
        return this.map((path) => (path.isDirectory ? path : path.parent));
    }
    /**
     * Returns true if any of the files in this set are directories that contain this path
     */
    contains(maybeChild) {
        return !!this.find((path) => path.contains(maybeChild));
    }
    diff(other) {
        let diffs = diff([...this], [...other], (a, b) => AbsolutePath.getFilename(a) === AbsolutePath.getFilename(b));
        return {
            added: AbsolutePaths.from(diffs.added),
            removed: AbsolutePaths.from(diffs.removed),
        };
    }
    /**
     * This method diffs files and directories, but excludes any removed files
     * that are descendents of a removed directory.
     */
    diffByKind(other) {
        let directories = this.directories.diff(other.directories);
        let collapsedDirectories = directories.removed.collapsedDirectories();
        let files = this.regularFiles.diff(other.regularFiles);
        return {
            files: {
                added: files.added,
                removed: files.removed.removeDescendentsOf(collapsedDirectories),
            },
            directories: {
                added: directories.added,
                removed: collapsedDirectories,
            },
        };
    }
    /**
     * Collapse any child directories into their parents.
     */
    collapsedDirectories() {
        let collapsed = AbsolutePaths.empty();
        for (let { path, rest } of this.#drain()) {
            if (path.isRegularFile || !rest.contains(path)) {
                collapsed.add(path);
            }
        }
        this.#paths = collapsed.#paths;
        return collapsed;
    }
    removeDescendentsOf(ancestors) {
        return this.map((path) => (ancestors.contains(path) ? null : path));
    }
    merge(paths) {
        let cloned = this.clone();
        cloned.add(paths);
        return cloned;
    }
    add(paths) {
        if (isArray(paths)) {
            for (let path of paths) {
                this.#add(path);
            }
        }
        else if (paths instanceof AbsolutePaths) {
            for (let path of paths) {
                this.#add(path);
            }
        }
        else {
            this.#add(paths);
        }
    }
    #add(...paths) {
        for (let path of paths) {
            let filename = AbsolutePath.getFilename(path);
            if (!this.#paths.has(filename)) {
                this.#paths.set(filename, path);
            }
        }
    }
    remove(paths) {
        let thisPaths = this.#paths;
        if (paths instanceof AbsolutePath) {
            let filename = AbsolutePath.getFilename(paths);
            thisPaths.delete(filename);
        }
        else {
            for (let filename of paths.#paths.keys()) {
                thisPaths.delete(filename);
            }
        }
    }
    has(path) {
        return this.#paths.has(AbsolutePath.getFilename(path));
    }
    reduce(mapper, initial, strategy = "functional") {
        if (strategy === "mutate") {
            for (let path of this) {
                mapper(initial, path);
            }
            return initial;
        }
        else {
            let accumulator = initial;
            for (let path of this) {
                accumulator = mapper(accumulator, path);
            }
            return accumulator;
        }
    }
    map(mapper) {
        let paths = AbsolutePaths.empty();
        for (let path of this.#paths.values()) {
            let mappedPath = mapper(path);
            if (mappedPath) {
                paths.add(mappedPath);
            }
        }
        return paths;
    }
    flatMap(mapper) {
        let paths = AbsolutePaths.empty();
        for (let path of this.#paths.values()) {
            paths.add(mapper(path));
        }
        return paths;
    }
    find(finder) {
        for (let path of this.#paths.values()) {
            let found = finder(path);
            if (found) {
                return path;
            }
        }
    }
    get #sorted() {
        let entries = [...this.#paths.entries()].sort(([a], [b]) => a.length - b.length);
        return new Map(entries);
    }
    /**
     * Iterate the paths in this set. Smaller paths come first.
     */
    *#drain() {
        let rest = this.#sorted.entries();
        let next = rest.next();
        while (!next.done) {
            let [, path] = next.value;
            let restPaths = new AbsolutePaths(new Map(rest));
            yield { path, rest: restPaths };
            rest = restPaths.#paths.entries();
            next = rest.next();
        }
    }
    *[Symbol.iterator]() {
        for (let path of this.#sorted.values()) {
            yield path;
        }
    }
    [INSPECT]() {
        return [...this];
    }
}
function isArray(value) {
    return Array.isArray(value);
}
function isRoot(p) {
    return path.parse(p).root === p;
}
class AbsolutePath {
    static file(path) {
        return AbsolutePath.#checked(path, "regular", ".file");
    }
    static from(intoPath) {
        if (isArray(intoPath)) {
            let [kind, filename] = intoPath;
            switch (kind) {
                case "root":
                case "directory":
                    return AbsolutePath.directory(filename);
                case "marked":
                    return AbsolutePath.marked(filename);
                case "regular":
                    return AbsolutePath.file(filename);
                default:
                    exhaustive(kind, "kind");
            }
        }
        else if (intoPath instanceof AbsolutePath) {
            return intoPath;
        }
        else {
            let { parent, basename: { file, ext }, kind, } = intoPath;
            if (parent) {
                if (ext) {
                    let filename = path.resolve(parent, `${file}.${ext}`);
                    return AbsolutePath.#checked(filename, kind ?? "regular", ".from");
                }
                else {
                    let filename = path.resolve(parent, file);
                    return AbsolutePath.#checked(filename, kind ?? "regular", ".from");
                }
            }
            else {
                // no parent means the file represents the root
                if (typeof kind === "string" && kind !== "root") {
                    throw Error(`BUG: getParts() produced { parent: null, kind: not 'root' } (invariant check)`);
                }
                return AbsolutePath.#checked(file, "root", ".from");
            }
        }
    }
    static directory(directory) {
        if (isRoot(directory)) {
            return AbsolutePath.#checked(directory, "root", ".directory");
        }
        else {
            return AbsolutePath.#checked(directory, "directory", ".directory");
        }
    }
    static marked(path) {
        if (isRoot(path)) {
            return AbsolutePath.#checked(path, "root", ".marked");
        }
        else if (path.endsWith("/")) {
            return AbsolutePath.#checked(path, "directory", ".marked");
        }
        else {
            return AbsolutePath.#checked(path, "regular", ".marked");
        }
    }
    static #checked(filename, kind, fromStaticMethod) {
        if (isAbsolute(filename)) {
            return new AbsolutePath(kind, filename);
        }
        else {
            throw Error(`Unexpected relative path passed to AbsolutePath${fromStaticMethod} (${path})`);
        }
    }
    static getFilename(path) {
        return path.#filename;
    }
    // A directory ends with `/`, while a file does not
    #kind;
    #filename;
    constructor(kind, filename) {
        this.#kind = kind;
        this.#filename = filename;
    }
    get isRoot() {
        return this.#kind === "root";
    }
    get isDirectory() {
        return this.#kind === "directory" || this.#kind === "root";
    }
    get isRegularFile() {
        return this.#kind === "regular";
    }
    /**
     * Get the parent directory of this AbsolutePath. If this path represents a
     * file system root, `parent` returns null.
     */
    get parent() {
        // Avoid infinite recursion at the root (`/` or `C:\`, etc.)
        if (this.isRoot) {
            return null;
        }
        else {
            return AbsolutePath.directory(path.dirname(this.#filename));
        }
    }
    get basename() {
        return getParts(this.#filename).basename;
    }
    get extension() {
        return this.basename.ext;
    }
    hasExtension(extension) {
        if (extension.startsWith(".")) {
            throw Error(`The extension passed to hasExtension should not have a leading '.'`);
        }
        let { basename: { ext }, } = getParts(this.#filename);
        return ext === extension;
    }
    changeExtension(extension) {
        let { parent, basename: { file, ext }, } = getParts(this.#filename);
        return AbsolutePath.file(path.resolve());
    }
    hasExactExtension(extension) {
        if (extension.startsWith(".")) {
            throw Error(`The extension passed to hasExtension should not have a leading '.'`);
        }
        let { basename: { ext }, } = getParts(this.#filename);
        return ext === extension;
    }
    async glob(...args) {
        let glob = undefined;
        let search = undefined;
        if (args.length !== 0) {
            if (typeof args[0] === "string") {
                [glob, search] = args;
            }
            else {
                [search] = args;
            }
        }
        if (this.#kind === "regular") {
            throw Error(`You cannot execute a glob inside a regular file (file=${this.#filename}, glob=${glob}, search=${search?.kind ?? "regular"})`);
        }
        return AbsolutePaths.glob(glob ?? "**", this, search);
    }
    file(...relativePath) {
        if (this.#kind === "regular") {
            throw Error(`Cannot create a nested file inside a regular file (parent=${this.#filename}, child=${path.join(...relativePath)})`);
        }
        return AbsolutePath.file(path.resolve(this.#filename, ...relativePath));
    }
    directory(...relativePath) {
        if (this.#kind === "regular") {
            throw Error(`Cannot create a nested directory inside a regular file (parent=${this.#filename}, child=${path.join(...relativePath)})`);
        }
        return AbsolutePath.directory(path.resolve(this.#filename, ...relativePath));
    }
    relativeFromAncestor(ancestor) {
        if (!ancestor.contains(this)) {
            throw Error(`Cannot compute a relative path from ${ancestor.#filename} to ${this.#filename}, because it is not an ancestor`);
        }
        return path.relative(ancestor.#filename, this.#filename);
    }
    contains(maybeChild) {
        let relative = path.relative(this.#filename, maybeChild.#filename);
        return !relative.startsWith(".");
    }
    eq(other) {
        return this.#filename === other.#filename;
    }
    [INSPECT](context, { stylize }) {
        return `${stylize("Path", "special")}(${stylize(this.#filename, "module")})`;
    }
}
class PrepareTranspilation {
    #files;
    #directories;
    constructor(files, directories) {
        this.#files = files;
        this.#directories = directories;
    }
    async prepare() { }
}
class TranspileTask {
    input;
    output;
    static create(input, output) {
        return new TranspileTask(input, output);
    }
    constructor(input, output) {
        this.input = input;
        this.output = output;
    }
}
async function workspacePackages(root, filter) {
    let stdout = await exec(sh `pnpm m ls --filter ./${filter} --depth -1 --porcelain`);
    if (stdout === undefined) {
        return [];
    }
    return stdout
        .split("\n")
        .filter((file) => file !== "" && file !== root)
        .map((p) => path.relative(root, p));
}
class ExecError extends Error {
    #code;
    #command;
    constructor(message, options) {
        super(message, options);
        this.#code = options.code;
        this.#command = options.command;
        Error.captureStackTrace(this, this.constructor);
    }
    get code() {
        return this.#code ?? "unknown";
    }
    get message() {
        let message = super.message;
        let header = `Exec Failed with code=${this.code}\n  (in ${this.#command})`;
        if (message) {
            return `${header}\n\n${message}`;
        }
        else {
            return header;
        }
    }
}
function exec(command) {
    return new Promise((fulfill, reject) => {
        let child = shell.exec(command, { silent: true, async: true });
        let stdout = readAll(child.stdout);
        let stderr = readAll(child.stderr);
        child.on("error", (err) => reject(err));
        child.on("exit", async (code) => {
            log("exec status", { code, stdout: await stdout });
            if (code === 0) {
                fulfill(await stdout);
            }
            else {
                log("exec error", {
                    error: await stderr,
                    out: await stdout,
                    code,
                    command,
                });
                reject(new ExecError((await stderr) ?? "", { code, command }));
            }
        });
    });
}
async function readAll(readable) {
    if (readable === undefined || readable === null) {
        return;
    }
    let result = await new PromiseReadable(readable).readAll();
    if (result === undefined) {
        return undefined;
    }
    else if (typeof result === "string") {
        return result;
    }
    else {
        return result.toString("utf-8");
    }
}
const PARTS_MATCHER = /^(?<file>[^.]*)(?:[.](?<ext>.*))?$/;
function getParts(filename) {
    let parent = getParent(filename);
    let basename = path.basename(filename);
    let extension = basename.match(PARTS_MATCHER);
    if (extension === null) {
        return { parent, basename: { file: basename, ext: null } };
    }
    let { file, ext } = extension.groups;
    return {
        parent,
        basename: { file, ext },
        kind: parent === null ? "root" : undefined,
    };
    // let [, basename, extname];
}
function getParent(filename) {
    let parent = path.dirname(filename);
    let root = path.parse(parent).root;
    if (filename === root) {
        return null;
    }
    else {
        return parent;
    }
}
function changeExtension(file, to) {
    const basename = path.basename(file, path.extname(file));
    return path.join(path.dirname(file), `${basename}.${to}`);
}
function exhaustive(value, description) {
    throw Error(`Expected ${description} to be exhaustively checked`);
}
function log(...args) {
    if (args.length === 2) {
        let [label, value] = args;
        console.log(label, util.inspect(value, { depth: null, colors: true }));
    }
    else {
        let [value] = args;
        console.log(util.inspect(value, { depth: null, colors: true }));
    }
}
function logged(value, description) {
    console.log(description, "=", util.inspect(value, { depth: null, colors: true }));
    return value;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbXBpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBWSxNQUFNLGlCQUFpQixDQUFDO0FBQ2pELE9BQU8sVUFBVSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNsQyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ2xDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNuRCxPQUFPLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNsQyxPQUFPLEtBQUssTUFBTSxTQUFTLENBQUM7QUFDNUIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFFN0IsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUVoRSxNQUFNLE9BQU8sU0FBUztJQUNwQjs7T0FFRztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQVksRUFBRSxTQUFpQjtRQUNqRCxJQUFJLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVyRCxJQUFJLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQzlCLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQzlCLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3pELElBQUksR0FBRyxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUM1RCxJQUFJ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RSxDQUFDLENBQUMsQ0FBQztLQUN4RTtTQUFNO1FBQ0wsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQ2pFO0FBQ0gsQ0FBQztBQUVELFNBQVMsTUFBTSxDQUFJLEtBQVEsRUFBRSxXQUFtQjtJQUM5QyxPQUFPLENBQUMsR0FBRyxDQUNULFdBQVcsRUFDWCxHQUFHLEVBQ0gsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUNuRCxDQUFDO0lBQ0YsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZGlmZiwgRGlmZkRhdGEgfSBmcm9tIFwiZmFzdC1hcnJheS1kaWZmXCI7XG5pbXBvcnQgc2VhcmNoR2xvYiBmcm9tIFwiZmFzdC1nbG9iXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnMvcHJvbWlzZXNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IGlzQWJzb2x1dGUgfSBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgUHJvbWlzZVJlYWRhYmxlIH0gZnJvbSBcInByb21pc2UtcmVhZGFibGVcIjtcbmltcG9ydCBzaCBmcm9tIFwic2hlbGwtZXNjYXBlLXRhZ1wiO1xuaW1wb3J0IHNoZWxsIGZyb20gXCJzaGVsbGpzXCI7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gXCJ1dGlsXCI7XG5cbmV4cG9ydCBjb25zdCBJTlNQRUNUID0gU3ltYm9sLmZvcihcIm5vZGVqcy51dGlsLmluc3BlY3QuY3VzdG9tXCIpO1xuXG5leHBvcnQgY2xhc3MgV29ya3NwYWNlIHtcbiAgLyoqXG4gICAqIEBwYXJhbSByb290IHRoZSByb290IG9mIHRoZSB3b3Jrc3BhY2UsIGFzIGFuIGFic29sdXRlIGRpcmVjdG9yeVxuICAgKi9cbiAgc3RhdGljIGFzeW5jIGNyZWF0ZShyb290OiBzdHJpbmcsIG5hbWVzcGFjZTogc3RyaW5nKSB7XG4gICAgbGV0IHBhdGhzID0gYXdhaXQgd29ya3NwYWNlUGFja2FnZXMocm9vdCwgbmFtZXNwYWNlKTtcblxuICAgIGxldCBwYWNrYWdlcyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgcGF0aHMubWFwKGFzeW5jIChwYWNrYWdlUm9vdCkgPT4ge1xuICAgICAgICBsZXQgbWFuaWZlc3QgPSBwYXRoLnJlc29sdmUocGFja2FnZVJvb3QsIFwicGFja2FnZS5qc29uXCIpO1xuICAgICAgICBsZXQgYnVmID0gYXdhaXQgZnMucmVhZEZpbGUobWFuaWZlc3QsIHsgZW5jb2Rpbmc6IFwidXRmOFwiIH0pO1xuICAgICAgICBsZXQganNvbjogSnNvbk9iamVjdCA9IEpTT04ucGFyc2UoYnVmKTtcblxuICAgICAgICBsZXQgcm9vdCA9IHBhdGguZGlybmFtZShtYW5pZmVzdCk7XG4gICAgICAgIGxldCBuYW1lID0gcGF0aC5iYXNlbmFtZShyb290KTtcblxuICAgICAgICByZXR1cm4gUGFja2FnZS5jcmVhdGUoKCkgPT4gd29ya3NwYWNlLCBuYW1lLCBqc29uKTtcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIGNvbnN0IHdvcmtzcGFjZTogV29ya3NwYWNlID0gbmV3IFdvcmtzcGFjZShyb290LCBuYW1lc3BhY2UsIHBhY2thZ2VzKTtcbiAgICByZXR1cm4gd29ya3NwYWNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBucG0gbmFtZXNwYWNlIChlLmcuIHRoZSAjbmFtZXNwYWNlIG9mIGBAc3RhcmJlYW0vY29yZWAgaXMgYEBzdGFyYmVhbWApXG4gICAqL1xuICByZWFkb25seSAjbmFtZXNwYWNlOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgcm9vdCBvZiB0aGUgd29ya3NwYWNlLCBhcyBhbiBhYnNvbHV0ZSBkaXJlY3RvcnlcbiAgICovXG4gIHJlYWRvbmx5ICNyb290OiBzdHJpbmc7XG5cbiAgI3BhY2thZ2VzOiByZWFkb25seSBQYWNrYWdlW107XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICByb290OiBzdHJpbmcsXG4gICAgbmFtZXNwYWNlOiBzdHJpbmcsXG4gICAgcGFja2FnZXM6IHJlYWRvbmx5IFBhY2thZ2VbXVxuICApIHtcbiAgICB0aGlzLiNyb290ID0gcm9vdDtcbiAgICB0aGlzLiNuYW1lc3BhY2UgPSBuYW1lc3BhY2U7XG4gICAgdGhpcy4jcGFja2FnZXMgPSBwYWNrYWdlcztcbiAgfVxuXG4gIGdldCByb290KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI3Jvb3Q7XG4gIH1cblxuICBnZXQgcGFja2FnZXMoKTogcmVhZG9ubHkgUGFja2FnZVtdIHtcbiAgICByZXR1cm4gdGhpcy4jcGFja2FnZXM7XG4gIH1cblxuICBnZXQgbmFtZXNwYWNlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI25hbWVzcGFjZTtcbiAgfVxufVxuXG50eXBlIEpzb25WYWx1ZSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsIHwgSnNvbkFycmF5IHwgSnNvbk9iamVjdDtcbnR5cGUgSnNvbkFycmF5ID0gcmVhZG9ubHkgSnNvblZhbHVlW107XG50eXBlIEpzb25PYmplY3QgPSB7IFtQIGluIHN0cmluZ106IEpzb25WYWx1ZSB9O1xuXG5jbGFzcyBQYWNrYWdlIHtcbiAgc3RhdGljIGNyZWF0ZShcbiAgICB3b3Jrc3BhY2U6ICgpID0+IFdvcmtzcGFjZSxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgbWFuaWZlc3Q6IEpzb25PYmplY3RcbiAgKTogUGFja2FnZSB7XG4gICAgcmV0dXJuIG5ldyBQYWNrYWdlKHdvcmtzcGFjZSwgbmFtZSwgbWFuaWZlc3QpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSB3b3Jrc3BhY2UgdGhhdCB0aGlzIHBhY2thZ2UgYmVsb25ncyB0by4gSXQncyBhIHRodW5rIGJlY2F1c2Ugd29ya3NwYWNlc1xuICAgKiBhbmQgcGFja2FnZXMgYXJlIGN5Y2xpYyBhbmQgaGF2ZSB0byBiZSBpbml0aWFsaXplZCB0b2dldGhlci5cbiAgICovXG4gIHJlYWRvbmx5ICN3b3Jrc3BhY2VUaHVuazogKCkgPT4gV29ya3NwYWNlO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgcGFja2FnZS4gRm9yIGV4YW1wbGUsIGAjbmFtZWAgb2YgYEBzdGFyYmVhbS9jb3JlYCBpcyBgY29yZWBcbiAgICovXG4gIHJlYWRvbmx5ICNsb2NhbE5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHBhcnNlZCBwYWNrYWdlLmpzb25cbiAgICovXG4gIHJlYWRvbmx5ICNtYW5pZmVzdDogSnNvbk9iamVjdDtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgIHdvcmtzcGFjZTogKCkgPT4gV29ya3NwYWNlLFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBtYW5pZmVzdDogSnNvbk9iamVjdFxuICApIHtcbiAgICB0aGlzLiN3b3Jrc3BhY2VUaHVuayA9IHdvcmtzcGFjZTtcbiAgICB0aGlzLiNsb2NhbE5hbWUgPSBuYW1lO1xuICAgIHRoaXMuI21hbmlmZXN0ID0gbWFuaWZlc3Q7XG4gIH1cblxuICBnZXQgI3dvcmtzcGFjZSgpOiBXb3Jrc3BhY2Uge1xuICAgIHJldHVybiB0aGlzLiN3b3Jrc3BhY2VUaHVuaygpO1xuICB9XG5cbiAgZ2V0IG5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dGhpcy4jd29ya3NwYWNlLm5hbWVzcGFjZX0vJHt0aGlzLiNsb2NhbE5hbWV9YDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcm9vdCBvZiB0aGlzIHBhY2thZ2UsIHdoaWNoIGNvbnRhaW5zIHRoZSBwYWNrYWdlLmpzb25cbiAgICovXG4gIGdldCByb290KCk6IEFic29sdXRlUGF0aCB7XG4gICAgcmV0dXJuIEFic29sdXRlUGF0aC5kaXJlY3RvcnkoXG4gICAgICBwYXRoLnJlc29sdmUoXG4gICAgICAgIHRoaXMuI3dvcmtzcGFjZS5yb290LFxuICAgICAgICB0aGlzLiN3b3Jrc3BhY2UubmFtZXNwYWNlLFxuICAgICAgICB0aGlzLiNsb2NhbE5hbWVcbiAgICAgIClcbiAgICApO1xuICB9XG5cbiAgZ2V0IHBhY2thZ2VKU09OKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHBhdGgucmVzb2x2ZSh0aGlzLiN3b3Jrc3BhY2Uucm9vdCk7XG4gIH1cblxuICBhc3luYyBjb21waWxlKCkge1xuICAgIC8vIGxldCByb290ID0gdGhpcy5yb290O1xuICAgIC8vIGxldCBkaXN0ID0gcGF0aC5qb2luKHRoaXMucm9vdCwgXCJkaXN0XCIpO1xuXG4gICAgbGV0IHRyYW5zcGlsYXRpb24gPSBhd2FpdCB0aGlzLiNwYWNrYWdlVHJhbnNwaWxhdGlvbigpO1xuICAgIGxldCBkaWZmID0gdHJhbnNwaWxhdGlvbi5kaWZmKFxuICAgICAgbG9nZ2VkKGF3YWl0IHRoaXMuI2dldERpc3RGaWxlcygpLCBcInRoaXMuI2dldERpc3RGaWxlc1wiKVxuICAgICk7XG5cbiAgICBsb2coZGlmZik7XG5cbiAgICAvLyBmb3IgKGxldCB0YXNrIG9mIGZpbGVzKSB7XG4gICAgLy8gICAvLyBjb25zb2xlLmxvZyh0YXNrKTtcbiAgICAvLyB9XG5cbiAgICAvLyBsZXQgZmlsZXMgPSBhd2FpdCBnbG9iKGAke3Jvb3R9LyEobm9kZV9tb2R1bGVzKSoqLyoudHNgKTtcblxuICAgIC8vIC8vIGNvbnNvbGUubG9nKHsgZmlsZXMgfSk7XG5cbiAgICAvLyBmb3IgKGxldCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgLy8gICBpZiAoZmlsZS5lbmRzV2l0aChcIi5kLnRzXCIpKSB7XG4gICAgLy8gICAgIGNvbnNvbGUud2FybihcbiAgICAvLyAgICAgICBgVW5leHBlY3RlZCAuZC50cyBmaWxlIGZvdW5kIGR1cmluZyBjb21waWxhdGlvbiAoJHtmaWxlfSlgXG4gICAgLy8gICAgICk7XG4gICAgLy8gICAgIGNvbnRpbnVlO1xuICAgIC8vICAgfVxuXG4gICAgLy8gICBsZXQgcmVsYXRpdmUgPSBwYXRoLnJlbGF0aXZlKHJvb3QsIGZpbGUpO1xuICAgIC8vICAgbGV0IG91dHB1dCA9IGF3YWl0IHN3Yy50cmFuc2Zvcm1GaWxlKGZpbGUsIHtcbiAgICAvLyAgICAgc291cmNlTWFwczogXCJpbmxpbmVcIixcbiAgICAvLyAgICAgaW5saW5lU291cmNlc0NvbnRlbnQ6IHRydWUsXG4gICAgLy8gICAgIGpzYzoge1xuICAgIC8vICAgICAgIHBhcnNlcjoge1xuICAgIC8vICAgICAgICAgc3ludGF4OiBcInR5cGVzY3JpcHRcIixcbiAgICAvLyAgICAgICAgIGRlY29yYXRvcnM6IHRydWUsXG4gICAgLy8gICAgICAgfSxcbiAgICAvLyAgICAgICB0YXJnZXQ6IFwiZXMyMDIyXCIsXG4gICAgLy8gICAgIH0sXG4gICAgLy8gICB9KTtcblxuICAgIC8vICAgbGV0IHRhcmdldCA9IGNoYW5nZUV4dGVuc2lvbihgJHtkaXN0fS8ke3JlbGF0aXZlfWAsIFwianNcIik7XG5cbiAgICAvLyAgIHNoZWxsLm1rZGlyKFwiLXBcIiwgcGF0aC5kaXJuYW1lKHRhcmdldCkpO1xuXG4gICAgLy8gICBmcy53cml0ZUZpbGUodGFyZ2V0LCBvdXRwdXQuY29kZSk7XG4gICAgLy8gfVxuICB9XG5cbiAgZ2V0ICNkaXN0KCk6IEFic29sdXRlUGF0aCB7XG4gICAgcmV0dXJuIHRoaXMucm9vdC5kaXJlY3RvcnkoXCJkaXN0XCIpO1xuICB9XG5cbiAgYXN5bmMgI3BhY2thZ2VUcmFuc3BpbGF0aW9uKCk6IFByb21pc2U8VHJhbnNwaWxhdGlvbj4ge1xuICAgIGxldCBmaWxlcyA9IGF3YWl0IEFic29sdXRlUGF0aHMuZ2xvYihgIShub2RlX21vZHVsZXMpKiovKi50c2AsIHRoaXMucm9vdCk7XG5cbiAgICBsZXQgZHRzID0gZmlsZXMuZmlsdGVyKChmaWxlKSA9PiBmaWxlLmhhc0V4YWN0RXh0ZW5zaW9uKFwiZC50c1wiKSk7XG5cbiAgICBmb3IgKGxldCBmaWxlIG9mIGR0cykge1xuICAgICAgY29uc29sZS53YXJuKGBVbmV4cGVjdGVkIC5kLnRzIGZpbGUgZm91bmQgZHVyaW5nIGNvbXBpbGF0aW9uICgke2ZpbGV9KWApO1xuICAgIH1cblxuICAgIGxldCB0cyA9IGZpbGVzXG4gICAgICAuZmlsdGVyKChmaWxlKSA9PiBmaWxlLmhhc0V4YWN0RXh0ZW5zaW9uKFwidHNcIikpXG4gICAgICAuZmlsdGVyKChmaWxlKSA9PiBmaWxlLmVxKHRoaXMucm9vdCkpO1xuXG4gICAgcmV0dXJuIFRyYW5zcGlsYXRpb24uY3JlYXRlKFxuICAgICAgdHMubWFwQXJyYXkoKGZpbGUpID0+IHRoaXMuI2ZpbGVUcmFuc3BpbGF0aW9uKGZpbGUpKVxuICAgICk7XG5cbiAgICAvLyBsZXQgZmlsZXMgPSBhd2FpdCBnbG9iKGAke3RoaXMucm9vdH0vIShub2RlX21vZHVsZXMpKiovKi50c2ApO1xuXG4gICAgLy8gZm9yIChsZXQgZmlsZSBvZiBmaWxlcykge1xuICAgIC8vICAgaWYgKGZpbGUuZW5kc1dpdGgoXCIuZC50c1wiKSkge1xuICAgIC8vICAgICBjb25zb2xlLndhcm4oXG4gICAgLy8gICAgICAgYFVuZXhwZWN0ZWQgLmQudHMgZmlsZSBmb3VuZCBkdXJpbmcgY29tcGlsYXRpb24gKCR7ZmlsZX0pYFxuICAgIC8vICAgICApO1xuICAgIC8vICAgfVxuICAgIC8vIH1cblxuICAgIC8vIGxldCB0YXNrcyA9IGZpbGVzXG4gICAgLy8gICAuZmlsdGVyKChmaWxlKSA9PiAhZmlsZS5zdGFydHNXaXRoKHRoaXMuI2Rpc3QpKVxuICAgIC8vICAgLmZpbHRlcigoZmlsZSkgPT4gIWZpbGUuZW5kc1dpdGgoXCIuZC50c1wiKSlcbiAgICAvLyAgIC5tYXAoKGZpbGUpID0+IHRoaXMuI2ZpbGVUcmFuc3BpbGF0aW9uKGZpbGUpKTtcblxuICAgIC8vIHJldHVybiBUcmFuc3BpbGF0aW9uLmNyZWF0ZSh0YXNrcyk7XG4gIH1cblxuICBhc3luYyAjZ2V0RGlzdEZpbGVzKCk6IFByb21pc2U8QWJzb2x1dGVQYXRocz4ge1xuICAgIHJldHVybiB0aGlzLiNkaXN0Lmdsb2IoXCIqKlwiLCB7IGtpbmQ6IFwiYWxsXCIgfSk7XG4gIH1cblxuICAjZmlsZVRyYW5zcGlsYXRpb24oaW5wdXRQYXRoOiBBYnNvbHV0ZVBhdGgpOiBUcmFuc3BpbGVUYXNrIHtcbiAgICBsZXQgcmVsYXRpdmVQYXRoID0gaW5wdXRQYXRoLnJlbGF0aXZlRnJvbUFuY2VzdG9yKHRoaXMucm9vdCk7XG4gICAgbGV0IG91dHB1dCA9IHRoaXMuI2Rpc3QuZmlsZShyZWxhdGl2ZVBhdGgpLmNoYW5nZUV4dGVuc2lvbihcImpzXCIpO1xuXG4gICAgLy8gY29uc29sZS5sb2coeyByZWxhdGl2ZVBhdGgsIG91dHB1dCB9KTtcblxuICAgIHJldHVybiBUcmFuc3BpbGVUYXNrLmNyZWF0ZShpbnB1dFBhdGgsIG91dHB1dCk7XG4gIH1cbn1cblxuY2xhc3MgVHJhbnNwaWxhdGlvbiB7XG4gIHN0YXRpYyBjcmVhdGUodGFza3M6IHJlYWRvbmx5IFRyYW5zcGlsZVRhc2tbXSkge1xuICAgIHJldHVybiBuZXcgVHJhbnNwaWxhdGlvbih0YXNrcyk7XG4gIH1cblxuICByZWFkb25seSAjdGFza3M6IHJlYWRvbmx5IFRyYW5zcGlsZVRhc2tbXTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHRhc2tzOiByZWFkb25seSBUcmFuc3BpbGVUYXNrW10pIHtcbiAgICB0aGlzLiN0YXNrcyA9IHRhc2tzO1xuICB9XG5cbiAgZGlmZihleGlzdGluZzogQWJzb2x1dGVQYXRocykge1xuICAgIHJldHVybiBleGlzdGluZy5kaWZmQnlLaW5kKHRoaXMub3V0cHV0UGF0aHMpO1xuICB9XG5cbiAgZ2V0IG91dHB1dFBhdGhzKCk6IEFic29sdXRlUGF0aHMge1xuICAgIGxldCBmaWxlcyA9IEFic29sdXRlUGF0aHMuZnJvbSh0aGlzLiN0YXNrcy5tYXAoKHRhc2spID0+IHRhc2sub3V0cHV0KSk7XG4gICAgbGV0IGRpcmVjdG9yaWVzID0gZmlsZXMuZGlyZWN0b3J5O1xuXG4gICAgcmV0dXJuIGZpbGVzLm1lcmdlKGRpcmVjdG9yaWVzKTtcbiAgfVxufVxuXG5hYnN0cmFjdCBjbGFzcyBNYXBwYWJsZTxTaW5nbGUsIE11bHRpcGxlPiB7XG4gIGFic3RyYWN0IG1hcChtYXBwZXI6IChwYXRoOiBTaW5nbGUpID0+IFNpbmdsZSB8IG51bGwpOiBNdWx0aXBsZTtcblxuICBhYnN0cmFjdCBmbGF0TWFwKFxuICAgIG1hcHBlcjogKHBhdGg6IFNpbmdsZSkgPT4gcmVhZG9ubHkgU2luZ2xlW10gfCBNdWx0aXBsZSB8IFNpbmdsZVxuICApOiBNdWx0aXBsZTtcblxuICBhYnN0cmFjdCBmaW5kKGZpbmRlcjogKHBhdGg6IFNpbmdsZSkgPT4gYm9vbGVhbik6IFNpbmdsZSB8IHZvaWQ7XG5cbiAgYWJzdHJhY3QgcmVkdWNlPFU+KFxuICAgIG1hcHBlcjogKGJ1aWxkOiBVLCBwYXRoOiBTaW5nbGUpID0+IHZvaWQsXG4gICAgYnVpbGQ6IFUsXG4gICAgc3RyYXRlZ3k6IFwibXV0YXRlXCJcbiAgKTogVTtcbiAgYWJzdHJhY3QgcmVkdWNlPFU+KFxuICAgIG1hcHBlcjogKGFjY3VtdWxhdG9yOiBVLCBwYXRoOiBTaW5nbGUpID0+IHZvaWQsXG4gICAgaW5pdGlhbDogVSxcbiAgICBzdHJhdGVneT86IFwiZnVuY3Rpb25hbFwiXG4gICk6IFU7XG5cbiAgZmlsdGVyKGZpbHRlcjogKGl0ZW06IFNpbmdsZSkgPT4gYm9vbGVhbik6IE11bHRpcGxlIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoKHNpbmdsZSkgPT4gKGZpbHRlcihzaW5nbGUpID8gc2luZ2xlIDogbnVsbCkpO1xuICB9XG5cbiAgbWFwQXJyYXk8VT4obWFwcGVyOiAoaXRlbTogU2luZ2xlKSA9PiBVKTogcmVhZG9ubHkgVVtdIHtcbiAgICByZXR1cm4gdGhpcy5yZWR1Y2UoXG4gICAgICAoYXJyYXk6IFVbXSwgaXRlbSkgPT4gYXJyYXkucHVzaChtYXBwZXIoaXRlbSkpLFxuICAgICAgW10sXG4gICAgICBcIm11dGF0ZVwiXG4gICAgKTtcbiAgfVxufVxuXG5jbGFzcyBBYnNvbHV0ZVBhdGhzXG4gIGV4dGVuZHMgTWFwcGFibGU8QWJzb2x1dGVQYXRoLCBBYnNvbHV0ZVBhdGhzPlxuICBpbXBsZW1lbnRzIEl0ZXJhYmxlPEFic29sdXRlUGF0aD5cbntcbiAgc3RhdGljIGVtcHR5KCk6IEFic29sdXRlUGF0aHMge1xuICAgIHJldHVybiBuZXcgQWJzb2x1dGVQYXRocyhuZXcgTWFwKCkpO1xuICB9XG5cbiAgc3RhdGljIGFzeW5jIGFsbChcbiAgICBpbnNpZGU6IEFic29sdXRlUGF0aCxcbiAgICBvcHRpb25zOiB7IGtpbmQ6IEZpbGVLaW5kIHwgXCJhbGxcIiB9ID0geyBraW5kOiBcInJlZ3VsYXJcIiB9XG4gICk6IFByb21pc2U8QWJzb2x1dGVQYXRocz4ge1xuICAgIHJldHVybiBBYnNvbHV0ZVBhdGhzLmdsb2IoXCIqKlwiLCBpbnNpZGUsIG9wdGlvbnMpO1xuICB9XG5cbiAgc3RhdGljIGFzeW5jIGdsb2IoXG4gICAgZ2xvYjogc3RyaW5nLFxuICAgIGluc2lkZTogQWJzb2x1dGVQYXRoLFxuICAgIHsga2luZCB9OiB7IGtpbmQ6IEZpbGVLaW5kIHwgXCJhbGxcIiB9ID0ge1xuICAgICAga2luZDogXCJyZWd1bGFyXCIsXG4gICAgfVxuICApIHtcbiAgICBsZXQgZnVsbEdsb2IgPSBwYXRoLnJlc29sdmUoQWJzb2x1dGVQYXRoLmdldEZpbGVuYW1lKGluc2lkZSksIGdsb2IpO1xuICAgIHJldHVybiBBYnNvbHV0ZVBhdGhzLiNnbG9iKGZ1bGxHbG9iLCBraW5kKTtcbiAgfVxuXG4gIHN0YXRpYyBhc3luYyAjZ2xvYihcbiAgICBnbG9iOiBzdHJpbmcsXG4gICAga2luZDogRmlsZUtpbmQgfCBcImFsbFwiXG4gICk6IFByb21pc2U8QWJzb2x1dGVQYXRocz4ge1xuICAgIHN3aXRjaCAoa2luZCkge1xuICAgICAgY2FzZSBcImRpcmVjdG9yeVwiOiB7XG4gICAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGhzLm1hcmtlZChcbiAgICAgICAgICBhd2FpdCBzZWFyY2hHbG9iKGdsb2IsIHtcbiAgICAgICAgICAgIG1hcmtEaXJlY3RvcmllczogdHJ1ZSxcbiAgICAgICAgICAgIG9ubHlEaXJlY3RvcmllczogdHJ1ZSxcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwicmVndWxhclwiOiB7XG4gICAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGhzLm1hcmtlZChcbiAgICAgICAgICBhd2FpdCBzZWFyY2hHbG9iKGdsb2IsIHtcbiAgICAgICAgICAgIG9ubHlGaWxlczogdHJ1ZSxcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwiYWxsXCI6IHtcbiAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aHMubWFya2VkKFxuICAgICAgICAgIGF3YWl0IHNlYXJjaEdsb2IoZ2xvYiwge1xuICAgICAgICAgICAgb25seUZpbGVzOiBmYWxzZSxcbiAgICAgICAgICAgIG9ubHlEaXJlY3RvcmllczogZmFsc2UsXG4gICAgICAgICAgICBtYXJrRGlyZWN0b3JpZXM6IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBleGhhdXN0aXZlKGtpbmQsIFwia2luZFwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzdGF0aWMgZnJvbShwYXRoczogcmVhZG9ubHkgSW50b0Fic29sdXRlUGF0aFtdKTogQWJzb2x1dGVQYXRocyB7XG4gICAgbGV0IHNldCA9IEFic29sdXRlUGF0aHMuZW1wdHkoKTtcblxuICAgIGZvciAobGV0IHBhdGggb2YgcGF0aHMpIHtcbiAgICAgIHNldC5hZGQoQWJzb2x1dGVQYXRoLmZyb20ocGF0aCkpO1xuICAgIH1cblxuICAgIHJldHVybiBzZXQ7XG4gIH1cblxuICBzdGF0aWMgbWFya2VkKHBhdGhzOiBJdGVyYWJsZTxzdHJpbmc+KTogQWJzb2x1dGVQYXRocyB7XG4gICAgbGV0IHNldCA9IEFic29sdXRlUGF0aHMuZW1wdHkoKTtcbiAgICBzZXQuYWRkKFsuLi5wYXRoc10ubWFwKEFic29sdXRlUGF0aC5tYXJrZWQpKTtcbiAgICByZXR1cm4gc2V0O1xuICB9XG5cbiAgI3BhdGhzOiBNYXA8c3RyaW5nLCBBYnNvbHV0ZVBhdGg+O1xuXG4gIGNvbnN0cnVjdG9yKHBhdGhzOiBNYXA8c3RyaW5nLCBBYnNvbHV0ZVBhdGg+KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLiNwYXRocyA9IHBhdGhzO1xuICB9XG5cbiAgY2xvbmUoKTogQWJzb2x1dGVQYXRocyB7XG4gICAgcmV0dXJuIG5ldyBBYnNvbHV0ZVBhdGhzKG5ldyBNYXAodGhpcy4jcGF0aHMpKTtcbiAgfVxuXG4gIGdldCBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuI3BhdGhzLnNpemU7XG4gIH1cblxuICBnZXQgcmVndWxhckZpbGVzKCk6IEFic29sdXRlUGF0aHMge1xuICAgIHJldHVybiB0aGlzLm1hcCgocGF0aCkgPT4gKHBhdGguaXNSZWd1bGFyRmlsZSA/IHBhdGggOiBudWxsKSk7XG4gIH1cblxuICBnZXQgZGlyZWN0b3JpZXMoKTogQWJzb2x1dGVQYXRocyB7XG4gICAgcmV0dXJuIHRoaXMubWFwKChwYXRoKSA9PiAocGF0aC5pc0RpcmVjdG9yeSA/IHBhdGggOiBudWxsKSk7XG4gIH1cblxuICAvKipcbiAgICogTWFwIGVhY2ggcGF0aCBpbiB0aGlzIHNldDpcbiAgICpcbiAgICogLSBpZiBpdCdzIGEgZGlyZWN0b3J5LCBsZWF2ZSBpdCBhbG9uZVxuICAgKiAtIGlmIGl0J3MgYSByZWd1bGFyIGZpbGUsIGdldCB0aGUgZmlsZSdzIGRpcmVjdG9yeVxuICAgKi9cbiAgZ2V0IGRpcmVjdG9yeSgpOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoKHBhdGgpID0+IChwYXRoLmlzRGlyZWN0b3J5ID8gcGF0aCA6IHBhdGgucGFyZW50KSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIGFueSBvZiB0aGUgZmlsZXMgaW4gdGhpcyBzZXQgYXJlIGRpcmVjdG9yaWVzIHRoYXQgY29udGFpbiB0aGlzIHBhdGhcbiAgICovXG4gIGNvbnRhaW5zKG1heWJlQ2hpbGQ6IEFic29sdXRlUGF0aCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuZmluZCgocGF0aCkgPT4gcGF0aC5jb250YWlucyhtYXliZUNoaWxkKSk7XG4gIH1cblxuICBkaWZmKG90aGVyOiBBYnNvbHV0ZVBhdGhzKTogeyBhZGRlZDogQWJzb2x1dGVQYXRoczsgcmVtb3ZlZDogQWJzb2x1dGVQYXRocyB9IHtcbiAgICBsZXQgZGlmZnMgPSBkaWZmKFxuICAgICAgWy4uLnRoaXNdLFxuICAgICAgWy4uLm90aGVyXSxcbiAgICAgIChhLCBiKSA9PiBBYnNvbHV0ZVBhdGguZ2V0RmlsZW5hbWUoYSkgPT09IEFic29sdXRlUGF0aC5nZXRGaWxlbmFtZShiKVxuICAgICk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgYWRkZWQ6IEFic29sdXRlUGF0aHMuZnJvbShkaWZmcy5hZGRlZCksXG4gICAgICByZW1vdmVkOiBBYnNvbHV0ZVBhdGhzLmZyb20oZGlmZnMucmVtb3ZlZCksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIG1ldGhvZCBkaWZmcyBmaWxlcyBhbmQgZGlyZWN0b3JpZXMsIGJ1dCBleGNsdWRlcyBhbnkgcmVtb3ZlZCBmaWxlc1xuICAgKiB0aGF0IGFyZSBkZXNjZW5kZW50cyBvZiBhIHJlbW92ZWQgZGlyZWN0b3J5LlxuICAgKi9cbiAgZGlmZkJ5S2luZChvdGhlcjogQWJzb2x1dGVQYXRocykge1xuICAgIGxldCBkaXJlY3RvcmllcyA9IHRoaXMuZGlyZWN0b3JpZXMuZGlmZihvdGhlci5kaXJlY3Rvcmllcyk7XG4gICAgbGV0IGNvbGxhcHNlZERpcmVjdG9yaWVzID0gZGlyZWN0b3JpZXMucmVtb3ZlZC5jb2xsYXBzZWREaXJlY3RvcmllcygpO1xuXG4gICAgbGV0IGZpbGVzID0gdGhpcy5yZWd1bGFyRmlsZXMuZGlmZihvdGhlci5yZWd1bGFyRmlsZXMpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGZpbGVzOiB7XG4gICAgICAgIGFkZGVkOiBmaWxlcy5hZGRlZCxcbiAgICAgICAgcmVtb3ZlZDogZmlsZXMucmVtb3ZlZC5yZW1vdmVEZXNjZW5kZW50c09mKGNvbGxhcHNlZERpcmVjdG9yaWVzKSxcbiAgICAgIH0sXG4gICAgICBkaXJlY3Rvcmllczoge1xuICAgICAgICBhZGRlZDogZGlyZWN0b3JpZXMuYWRkZWQsXG4gICAgICAgIHJlbW92ZWQ6IGNvbGxhcHNlZERpcmVjdG9yaWVzLFxuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIENvbGxhcHNlIGFueSBjaGlsZCBkaXJlY3RvcmllcyBpbnRvIHRoZWlyIHBhcmVudHMuXG4gICAqL1xuICBjb2xsYXBzZWREaXJlY3RvcmllcygpOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICBsZXQgY29sbGFwc2VkID0gQWJzb2x1dGVQYXRocy5lbXB0eSgpO1xuXG4gICAgZm9yIChsZXQgeyBwYXRoLCByZXN0IH0gb2YgdGhpcy4jZHJhaW4oKSkge1xuICAgICAgaWYgKHBhdGguaXNSZWd1bGFyRmlsZSB8fCAhcmVzdC5jb250YWlucyhwYXRoKSkge1xuICAgICAgICBjb2xsYXBzZWQuYWRkKHBhdGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuI3BhdGhzID0gY29sbGFwc2VkLiNwYXRocztcbiAgICByZXR1cm4gY29sbGFwc2VkO1xuICB9XG5cbiAgcmVtb3ZlRGVzY2VuZGVudHNPZihhbmNlc3RvcnM6IEFic29sdXRlUGF0aHMpOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoKHBhdGgpID0+IChhbmNlc3RvcnMuY29udGFpbnMocGF0aCkgPyBudWxsIDogcGF0aCkpO1xuICB9XG5cbiAgbWVyZ2UoXG4gICAgcGF0aHM6IEFic29sdXRlUGF0aCB8IEFic29sdXRlUGF0aHMgfCByZWFkb25seSBBYnNvbHV0ZVBhdGhbXVxuICApOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICBsZXQgY2xvbmVkID0gdGhpcy5jbG9uZSgpO1xuICAgIGNsb25lZC5hZGQocGF0aHMpO1xuICAgIHJldHVybiBjbG9uZWQ7XG4gIH1cblxuICBhZGQocGF0aHM6IEFic29sdXRlUGF0aCB8IEFic29sdXRlUGF0aHMgfCByZWFkb25seSBBYnNvbHV0ZVBhdGhbXSk6IHZvaWQge1xuICAgIGlmIChpc0FycmF5KHBhdGhzKSkge1xuICAgICAgZm9yIChsZXQgcGF0aCBvZiBwYXRocykge1xuICAgICAgICB0aGlzLiNhZGQocGF0aCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwYXRocyBpbnN0YW5jZW9mIEFic29sdXRlUGF0aHMpIHtcbiAgICAgIGZvciAobGV0IHBhdGggb2YgcGF0aHMpIHtcbiAgICAgICAgdGhpcy4jYWRkKHBhdGgpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLiNhZGQocGF0aHMpO1xuICAgIH1cbiAgfVxuXG4gICNhZGQoLi4ucGF0aHM6IHJlYWRvbmx5IEFic29sdXRlUGF0aFtdKTogdm9pZCB7XG4gICAgZm9yIChsZXQgcGF0aCBvZiBwYXRocykge1xuICAgICAgbGV0IGZpbGVuYW1lID0gQWJzb2x1dGVQYXRoLmdldEZpbGVuYW1lKHBhdGgpO1xuXG4gICAgICBpZiAoIXRoaXMuI3BhdGhzLmhhcyhmaWxlbmFtZSkpIHtcbiAgICAgICAgdGhpcy4jcGF0aHMuc2V0KGZpbGVuYW1lLCBwYXRoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZW1vdmUocGF0aHM6IEFic29sdXRlUGF0aHMgfCBBYnNvbHV0ZVBhdGgpIHtcbiAgICBsZXQgdGhpc1BhdGhzID0gdGhpcy4jcGF0aHM7XG5cbiAgICBpZiAocGF0aHMgaW5zdGFuY2VvZiBBYnNvbHV0ZVBhdGgpIHtcbiAgICAgIGxldCBmaWxlbmFtZSA9IEFic29sdXRlUGF0aC5nZXRGaWxlbmFtZShwYXRocyk7XG4gICAgICB0aGlzUGF0aHMuZGVsZXRlKGZpbGVuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChsZXQgZmlsZW5hbWUgb2YgcGF0aHMuI3BhdGhzLmtleXMoKSkge1xuICAgICAgICB0aGlzUGF0aHMuZGVsZXRlKGZpbGVuYW1lKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBoYXMocGF0aDogQWJzb2x1dGVQYXRoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuI3BhdGhzLmhhcyhBYnNvbHV0ZVBhdGguZ2V0RmlsZW5hbWUocGF0aCkpO1xuICB9XG5cbiAgcmVkdWNlPFU+KFxuICAgIG1hcHBlcjogKGJ1aWxkOiBVLCBwYXRoOiBBYnNvbHV0ZVBhdGgpID0+IHZvaWQsXG4gICAgYnVpbGQ6IFUsXG4gICAgc3RyYXRlZ3k6IFwibXV0YXRlXCJcbiAgKTogVTtcbiAgcmVkdWNlPFU+KFxuICAgIG1hcHBlcjogKGFjY3VtdWxhdG9yOiBVLCBwYXRoOiBBYnNvbHV0ZVBhdGgpID0+IHZvaWQsXG4gICAgaW5pdGlhbDogVSxcbiAgICBzdHJhdGVneT86IFwiZnVuY3Rpb25hbFwiXG4gICk6IFU7XG4gIHJlZHVjZTxVPihcbiAgICBtYXBwZXI6IChidWlsZDogVSwgcGF0aDogQWJzb2x1dGVQYXRoKSA9PiBVIHwgdm9pZCxcbiAgICBpbml0aWFsOiBVLFxuICAgIHN0cmF0ZWd5OiBcImZ1bmN0aW9uYWxcIiB8IFwibXV0YXRlXCIgPSBcImZ1bmN0aW9uYWxcIlxuICApOiBVIHtcbiAgICBpZiAoc3RyYXRlZ3kgPT09IFwibXV0YXRlXCIpIHtcbiAgICAgIGZvciAobGV0IHBhdGggb2YgdGhpcykge1xuICAgICAgICBtYXBwZXIoaW5pdGlhbCwgcGF0aCk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBpbml0aWFsO1xuICAgIH0gZWxzZSB7XG4gICAgICBsZXQgYWNjdW11bGF0b3IgPSBpbml0aWFsO1xuXG4gICAgICBmb3IgKGxldCBwYXRoIG9mIHRoaXMpIHtcbiAgICAgICAgYWNjdW11bGF0b3IgPSBtYXBwZXIoYWNjdW11bGF0b3IsIHBhdGgpIGFzIFU7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhY2N1bXVsYXRvcjtcbiAgICB9XG4gIH1cblxuICBtYXAobWFwcGVyOiAocGF0aDogQWJzb2x1dGVQYXRoKSA9PiBBYnNvbHV0ZVBhdGggfCBudWxsKTogQWJzb2x1dGVQYXRocyB7XG4gICAgbGV0IHBhdGhzID0gQWJzb2x1dGVQYXRocy5lbXB0eSgpO1xuXG4gICAgZm9yIChsZXQgcGF0aCBvZiB0aGlzLiNwYXRocy52YWx1ZXMoKSkge1xuICAgICAgbGV0IG1hcHBlZFBhdGggPSBtYXBwZXIocGF0aCk7XG5cbiAgICAgIGlmIChtYXBwZWRQYXRoKSB7XG4gICAgICAgIHBhdGhzLmFkZChtYXBwZWRQYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcGF0aHM7XG4gIH1cblxuICBmbGF0TWFwKFxuICAgIG1hcHBlcjogKFxuICAgICAgcGF0aDogQWJzb2x1dGVQYXRoXG4gICAgKSA9PiByZWFkb25seSBBYnNvbHV0ZVBhdGhbXSB8IEFic29sdXRlUGF0aHMgfCBBYnNvbHV0ZVBhdGhcbiAgKTogQWJzb2x1dGVQYXRocyB7XG4gICAgbGV0IHBhdGhzID0gQWJzb2x1dGVQYXRocy5lbXB0eSgpO1xuXG4gICAgZm9yIChsZXQgcGF0aCBvZiB0aGlzLiNwYXRocy52YWx1ZXMoKSkge1xuICAgICAgcGF0aHMuYWRkKG1hcHBlcihwYXRoKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhdGhzO1xuICB9XG5cbiAgZmluZChmaW5kZXI6IChwYXRoOiBBYnNvbHV0ZVBhdGgpID0+IGJvb2xlYW4pOiBBYnNvbHV0ZVBhdGggfCB2b2lkIHtcbiAgICBmb3IgKGxldCBwYXRoIG9mIHRoaXMuI3BhdGhzLnZhbHVlcygpKSB7XG4gICAgICBsZXQgZm91bmQgPSBmaW5kZXIocGF0aCk7XG5cbiAgICAgIGlmIChmb3VuZCkge1xuICAgICAgICByZXR1cm4gcGF0aDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXQgI3NvcnRlZCgpOiBNYXA8c3RyaW5nLCBBYnNvbHV0ZVBhdGg+IHtcbiAgICBsZXQgZW50cmllcyA9IFsuLi50aGlzLiNwYXRocy5lbnRyaWVzKCldLnNvcnQoXG4gICAgICAoW2FdLCBbYl0pID0+IGEubGVuZ3RoIC0gYi5sZW5ndGhcbiAgICApO1xuICAgIHJldHVybiBuZXcgTWFwKGVudHJpZXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEl0ZXJhdGUgdGhlIHBhdGhzIGluIHRoaXMgc2V0LiBTbWFsbGVyIHBhdGhzIGNvbWUgZmlyc3QuXG4gICAqL1xuICAqI2RyYWluKCk6IEl0ZXJhYmxlSXRlcmF0b3I8eyBwYXRoOiBBYnNvbHV0ZVBhdGg7IHJlc3Q6IEFic29sdXRlUGF0aHMgfT4ge1xuICAgIGxldCByZXN0ID0gdGhpcy4jc29ydGVkLmVudHJpZXMoKTtcbiAgICBsZXQgbmV4dCA9IHJlc3QubmV4dCgpO1xuXG4gICAgd2hpbGUgKCFuZXh0LmRvbmUpIHtcbiAgICAgIGxldCBbLCBwYXRoXSA9IG5leHQudmFsdWU7XG4gICAgICBsZXQgcmVzdFBhdGhzID0gbmV3IEFic29sdXRlUGF0aHMobmV3IE1hcChyZXN0KSk7XG5cbiAgICAgIHlpZWxkIHsgcGF0aCwgcmVzdDogcmVzdFBhdGhzIH07XG5cbiAgICAgIHJlc3QgPSByZXN0UGF0aHMuI3BhdGhzLmVudHJpZXMoKTtcbiAgICAgIG5leHQgPSByZXN0Lm5leHQoKTtcbiAgICB9XG4gIH1cblxuICAqW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgZm9yIChsZXQgcGF0aCBvZiB0aGlzLiNzb3J0ZWQudmFsdWVzKCkpIHtcbiAgICAgIHlpZWxkIHBhdGg7XG4gICAgfVxuICB9XG5cbiAgW0lOU1BFQ1RdKCkge1xuICAgIHJldHVybiBbLi4udGhpc107XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNBcnJheTxUIGV4dGVuZHMgdW5rbm93bltdIHwgcmVhZG9ubHkgdW5rbm93bltdPihcbiAgdmFsdWU6IHVua25vd24gfCBUXG4pOiB2YWx1ZSBpcyBUIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBpc1Jvb3QocDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBwYXRoLnBhcnNlKHApLnJvb3QgPT09IHA7XG59XG5cbnR5cGUgRmlsZUtpbmQgPSBcInJlZ3VsYXJcIiB8IFwiZGlyZWN0b3J5XCI7XG50eXBlIFNlYXJjaEtpbmQgPSBGaWxlS2luZCB8IFwiYWxsXCI7XG50eXBlIEFic29sdXRlUGF0aEtpbmQgPSBGaWxlS2luZCB8IFwicm9vdFwiO1xudHlwZSBJbnRvQWJzb2x1dGVQYXRoID1cbiAgfCBBYnNvbHV0ZVBhdGhcbiAgfCBGaWxlUGFydHNcbiAgfCBba2luZDogQWJzb2x1dGVQYXRoS2luZCB8IFwibWFya2VkXCIsIGZpbGVuYW1lOiBzdHJpbmddO1xuXG5pbnRlcmZhY2UgU2VhcmNoIHtcbiAga2luZDogU2VhcmNoS2luZDtcbn1cblxuY2xhc3MgQWJzb2x1dGVQYXRoIHtcbiAgc3RhdGljIGZpbGUocGF0aDogc3RyaW5nKTogQWJzb2x1dGVQYXRoIHtcbiAgICByZXR1cm4gQWJzb2x1dGVQYXRoLiNjaGVja2VkKHBhdGgsIFwicmVndWxhclwiLCBcIi5maWxlXCIpO1xuICB9XG5cbiAgc3RhdGljIGZyb20oaW50b1BhdGg6IEludG9BYnNvbHV0ZVBhdGgpOiBBYnNvbHV0ZVBhdGgge1xuICAgIGlmIChpc0FycmF5KGludG9QYXRoKSkge1xuICAgICAgbGV0IFtraW5kLCBmaWxlbmFtZV0gPSBpbnRvUGF0aDtcblxuICAgICAgc3dpdGNoIChraW5kKSB7XG4gICAgICAgIGNhc2UgXCJyb290XCI6XG4gICAgICAgIGNhc2UgXCJkaXJlY3RvcnlcIjpcbiAgICAgICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLmRpcmVjdG9yeShmaWxlbmFtZSk7XG4gICAgICAgIGNhc2UgXCJtYXJrZWRcIjpcbiAgICAgICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLm1hcmtlZChmaWxlbmFtZSk7XG4gICAgICAgIGNhc2UgXCJyZWd1bGFyXCI6XG4gICAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC5maWxlKGZpbGVuYW1lKTtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGV4aGF1c3RpdmUoa2luZCwgXCJraW5kXCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaW50b1BhdGggaW5zdGFuY2VvZiBBYnNvbHV0ZVBhdGgpIHtcbiAgICAgIHJldHVybiBpbnRvUGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHtcbiAgICAgICAgcGFyZW50LFxuICAgICAgICBiYXNlbmFtZTogeyBmaWxlLCBleHQgfSxcbiAgICAgICAga2luZCxcbiAgICAgIH0gPSBpbnRvUGF0aDtcblxuICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICBpZiAoZXh0KSB7XG4gICAgICAgICAgbGV0IGZpbGVuYW1lID0gcGF0aC5yZXNvbHZlKHBhcmVudCwgYCR7ZmlsZX0uJHtleHR9YCk7XG4gICAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChmaWxlbmFtZSwga2luZCA/PyBcInJlZ3VsYXJcIiwgXCIuZnJvbVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXQgZmlsZW5hbWUgPSBwYXRoLnJlc29sdmUocGFyZW50LCBmaWxlKTtcbiAgICAgICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLiNjaGVja2VkKGZpbGVuYW1lLCBraW5kID8/IFwicmVndWxhclwiLCBcIi5mcm9tXCIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBubyBwYXJlbnQgbWVhbnMgdGhlIGZpbGUgcmVwcmVzZW50cyB0aGUgcm9vdFxuICAgICAgICBpZiAodHlwZW9mIGtpbmQgPT09IFwic3RyaW5nXCIgJiYga2luZCAhPT0gXCJyb290XCIpIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgICAgIGBCVUc6IGdldFBhcnRzKCkgcHJvZHVjZWQgeyBwYXJlbnQ6IG51bGwsIGtpbmQ6IG5vdCAncm9vdCcgfSAoaW52YXJpYW50IGNoZWNrKWBcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChmaWxlLCBcInJvb3RcIiwgXCIuZnJvbVwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzdGF0aWMgZGlyZWN0b3J5KGRpcmVjdG9yeTogc3RyaW5nKTogQWJzb2x1dGVQYXRoIHtcbiAgICBpZiAoaXNSb290KGRpcmVjdG9yeSkpIHtcbiAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguI2NoZWNrZWQoZGlyZWN0b3J5LCBcInJvb3RcIiwgXCIuZGlyZWN0b3J5XCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLiNjaGVja2VkKGRpcmVjdG9yeSwgXCJkaXJlY3RvcnlcIiwgXCIuZGlyZWN0b3J5XCIpO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBtYXJrZWQocGF0aDogc3RyaW5nKTogQWJzb2x1dGVQYXRoIHtcbiAgICBpZiAoaXNSb290KHBhdGgpKSB7XG4gICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLiNjaGVja2VkKHBhdGgsIFwicm9vdFwiLCBcIi5tYXJrZWRcIik7XG4gICAgfSBlbHNlIGlmIChwYXRoLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChwYXRoLCBcImRpcmVjdG9yeVwiLCBcIi5tYXJrZWRcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguI2NoZWNrZWQocGF0aCwgXCJyZWd1bGFyXCIsIFwiLm1hcmtlZFwiKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgI2NoZWNrZWQoXG4gICAgZmlsZW5hbWU6IHN0cmluZyxcbiAgICBraW5kOiBcInJvb3RcIiB8IFwiZGlyZWN0b3J5XCIgfCBcInJlZ3VsYXJcIixcbiAgICBmcm9tU3RhdGljTWV0aG9kOiBzdHJpbmdcbiAgKTogQWJzb2x1dGVQYXRoIHtcbiAgICBpZiAoaXNBYnNvbHV0ZShmaWxlbmFtZSkpIHtcbiAgICAgIHJldHVybiBuZXcgQWJzb2x1dGVQYXRoKGtpbmQsIGZpbGVuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIGBVbmV4cGVjdGVkIHJlbGF0aXZlIHBhdGggcGFzc2VkIHRvIEFic29sdXRlUGF0aCR7ZnJvbVN0YXRpY01ldGhvZH0gKCR7cGF0aH0pYFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgZ2V0RmlsZW5hbWUocGF0aDogQWJzb2x1dGVQYXRoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcGF0aC4jZmlsZW5hbWU7XG4gIH1cblxuICAvLyBBIGRpcmVjdG9yeSBlbmRzIHdpdGggYC9gLCB3aGlsZSBhIGZpbGUgZG9lcyBub3RcbiAgcmVhZG9ubHkgI2tpbmQ6IFwicmVndWxhclwiIHwgXCJkaXJlY3RvcnlcIiB8IFwicm9vdFwiO1xuICByZWFkb25seSAjZmlsZW5hbWU6IHN0cmluZztcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgIGtpbmQ6IFwicmVndWxhclwiIHwgXCJkaXJlY3RvcnlcIiB8IFwicm9vdFwiLFxuICAgIGZpbGVuYW1lOiBzdHJpbmdcbiAgKSB7XG4gICAgdGhpcy4ja2luZCA9IGtpbmQ7XG4gICAgdGhpcy4jZmlsZW5hbWUgPSBmaWxlbmFtZTtcbiAgfVxuXG4gIGdldCBpc1Jvb3QoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuI2tpbmQgPT09IFwicm9vdFwiO1xuICB9XG5cbiAgZ2V0IGlzRGlyZWN0b3J5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiNraW5kID09PSBcImRpcmVjdG9yeVwiIHx8IHRoaXMuI2tpbmQgPT09IFwicm9vdFwiO1xuICB9XG5cbiAgZ2V0IGlzUmVndWxhckZpbGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuI2tpbmQgPT09IFwicmVndWxhclwiO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcGFyZW50IGRpcmVjdG9yeSBvZiB0aGlzIEFic29sdXRlUGF0aC4gSWYgdGhpcyBwYXRoIHJlcHJlc2VudHMgYVxuICAgKiBmaWxlIHN5c3RlbSByb290LCBgcGFyZW50YCByZXR1cm5zIG51bGwuXG4gICAqL1xuICBnZXQgcGFyZW50KCk6IEFic29sdXRlUGF0aCB8IG51bGwge1xuICAgIC8vIEF2b2lkIGluZmluaXRlIHJlY3Vyc2lvbiBhdCB0aGUgcm9vdCAoYC9gIG9yIGBDOlxcYCwgZXRjLilcbiAgICBpZiAodGhpcy5pc1Jvb3QpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLmRpcmVjdG9yeShwYXRoLmRpcm5hbWUodGhpcy4jZmlsZW5hbWUpKTtcbiAgICB9XG4gIH1cblxuICBnZXQgYmFzZW5hbWUoKTogeyBmaWxlOiBzdHJpbmc7IGV4dDogc3RyaW5nIHwgbnVsbCB9IHtcbiAgICByZXR1cm4gZ2V0UGFydHModGhpcy4jZmlsZW5hbWUpLmJhc2VuYW1lO1xuICB9XG5cbiAgZ2V0IGV4dGVuc2lvbigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5iYXNlbmFtZS5leHQ7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBzcGVjaWZpZWQgZXh0ZW5zaW9uIGlzIGF0IHRoZSBlbmQgb2YgdGhlIGZpbGVuYW1lLiBUaGlzXG4gICAqIG1lYW5zIHRoYXQgYGluZGV4LmQudHNgIGhhcyB0aGUgZXh0ZW5zaW9uIGBkLnRzYCAqYW5kKiBgdHNgLlxuICAgKlxuICAgKiBTZWUgaGFzRXhhY3RFeHRlbnNpb24gaWYgeW91IHdhbnQgYGQudHNgIHRvIG1hdGNoLCBidXQgbm90IGB0c2BcbiAgICovXG4gIGhhc0V4dGVuc2lvbjxTIGV4dGVuZHMgYC4ke3N0cmluZ31gPihcbiAgICBleHRlbnNpb246IFNcbiAgKTogYFRoZSBleHRlbnNpb24gcGFzc2VkIHRvIGhhc0V4dGVuc2lvbiBzaG91bGQgbm90IGhhdmUgYSBsZWFkaW5nICcuJ2A7XG4gIGhhc0V4dGVuc2lvbihleHRlbnNpb246IHN0cmluZyk6IGJvb2xlYW47XG4gIGhhc0V4dGVuc2lvbihleHRlbnNpb246IHN0cmluZyk6IHVua25vd24ge1xuICAgIGlmIChleHRlbnNpb24uc3RhcnRzV2l0aChcIi5cIikpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBgVGhlIGV4dGVuc2lvbiBwYXNzZWQgdG8gaGFzRXh0ZW5zaW9uIHNob3VsZCBub3QgaGF2ZSBhIGxlYWRpbmcgJy4nYFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBsZXQge1xuICAgICAgYmFzZW5hbWU6IHsgZXh0IH0sXG4gICAgfSA9IGdldFBhcnRzKHRoaXMuI2ZpbGVuYW1lKTtcblxuICAgIHJldHVybiBleHQgPT09IGV4dGVuc2lvbjtcbiAgfVxuXG4gIGNoYW5nZUV4dGVuc2lvbjxTIGV4dGVuZHMgYC4ke3N0cmluZ31gPihcbiAgICBleHRlbnNpb246IFNcbiAgKTogYFRoZSBleHRlbnNpb24gcGFzc2VkIHRvIGhhc0V4dGVuc2lvbiBzaG91bGQgbm90IGhhdmUgYSBsZWFkaW5nICcuJ2A7XG4gIGNoYW5nZUV4dGVuc2lvbihleHRlbnNpb246IHN0cmluZyk6IEFic29sdXRlUGF0aDtcbiAgY2hhbmdlRXh0ZW5zaW9uKGV4dGVuc2lvbjogc3RyaW5nKTogdW5rbm93biB7XG4gICAgbGV0IHtcbiAgICAgIHBhcmVudCxcbiAgICAgIGJhc2VuYW1lOiB7IGZpbGUsIGV4dCB9LFxuICAgIH0gPSBnZXRQYXJ0cyh0aGlzLiNmaWxlbmFtZSk7XG5cbiAgICByZXR1cm4gQWJzb2x1dGVQYXRoLmZpbGUocGF0aC5yZXNvbHZlKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZmlsZSBtYXRjaGVzIHRoZSBleGFjdCBleHRlbnNpb24uIFRoaXMgbWVhbnMgdGhhdFxuICAgKiBgaW5kZXguZC50c2AgaGFzIHRoZSBleGFjdCBleHRlbnNpb24gYGQudHNgIGJ1dCAqbm90KiBgdHNgLlxuICAgKi9cbiAgaGFzRXhhY3RFeHRlbnNpb248UyBleHRlbmRzIGAuJHtzdHJpbmd9YD4oXG4gICAgZXh0ZW5zaW9uOiBTXG4gICk6IGBUaGUgZXh0ZW5zaW9uIHBhc3NlZCB0byBoYXNFeHRlbnNpb24gc2hvdWxkIG5vdCBoYXZlIGEgbGVhZGluZyAnLidgO1xuICBoYXNFeGFjdEV4dGVuc2lvbihleHRlbnNpb246IHN0cmluZyk6IGJvb2xlYW47XG4gIGhhc0V4YWN0RXh0ZW5zaW9uKGV4dGVuc2lvbjogc3RyaW5nKTogdW5rbm93biB7XG4gICAgaWYgKGV4dGVuc2lvbi5zdGFydHNXaXRoKFwiLlwiKSkge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIGBUaGUgZXh0ZW5zaW9uIHBhc3NlZCB0byBoYXNFeHRlbnNpb24gc2hvdWxkIG5vdCBoYXZlIGEgbGVhZGluZyAnLidgXG4gICAgICApO1xuICAgIH1cblxuICAgIGxldCB7XG4gICAgICBiYXNlbmFtZTogeyBleHQgfSxcbiAgICB9ID0gZ2V0UGFydHModGhpcy4jZmlsZW5hbWUpO1xuXG4gICAgcmV0dXJuIGV4dCA9PT0gZXh0ZW5zaW9uO1xuICB9XG5cbiAgYXN5bmMgZ2xvYihzZWFyY2g6IFNlYXJjaCk6IFByb21pc2U8QWJzb2x1dGVQYXRocz47XG4gIGFzeW5jIGdsb2IoZ2xvYjogc3RyaW5nLCBzZWFyY2g/OiBTZWFyY2gpOiBQcm9taXNlPEFic29sdXRlUGF0aHM+O1xuICBhc3luYyBnbG9iKCk6IFByb21pc2U8QWJzb2x1dGVQYXRocz47XG4gIGFzeW5jIGdsb2IoXG4gICAgLi4uYXJnczogW3NlYXJjaDogU2VhcmNoXSB8IFtnbG9iOiBzdHJpbmcsIHNlYXJjaD86IFNlYXJjaF0gfCBbXVxuICApOiBQcm9taXNlPEFic29sdXRlUGF0aHM+IHtcbiAgICBsZXQgZ2xvYjogc3RyaW5nIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGxldCBzZWFyY2g6IFNlYXJjaCB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcblxuICAgIGlmIChhcmdzLmxlbmd0aCAhPT0gMCkge1xuICAgICAgaWYgKHR5cGVvZiBhcmdzWzBdID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgIFtnbG9iLCBzZWFyY2hdID0gYXJncztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIFtzZWFyY2hdID0gYXJncztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy4ja2luZCA9PT0gXCJyZWd1bGFyXCIpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBgWW91IGNhbm5vdCBleGVjdXRlIGEgZ2xvYiBpbnNpZGUgYSByZWd1bGFyIGZpbGUgKGZpbGU9JHtcbiAgICAgICAgICB0aGlzLiNmaWxlbmFtZVxuICAgICAgICB9LCBnbG9iPSR7Z2xvYn0sIHNlYXJjaD0ke3NlYXJjaD8ua2luZCA/PyBcInJlZ3VsYXJcIn0pYFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gQWJzb2x1dGVQYXRocy5nbG9iKGdsb2IgPz8gXCIqKlwiLCB0aGlzLCBzZWFyY2gpO1xuICB9XG5cbiAgZmlsZSguLi5yZWxhdGl2ZVBhdGg6IHJlYWRvbmx5IHN0cmluZ1tdKTogQWJzb2x1dGVQYXRoIHtcbiAgICBpZiAodGhpcy4ja2luZCA9PT0gXCJyZWd1bGFyXCIpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBgQ2Fubm90IGNyZWF0ZSBhIG5lc3RlZCBmaWxlIGluc2lkZSBhIHJlZ3VsYXIgZmlsZSAocGFyZW50PSR7XG4gICAgICAgICAgdGhpcy4jZmlsZW5hbWVcbiAgICAgICAgfSwgY2hpbGQ9JHtwYXRoLmpvaW4oLi4ucmVsYXRpdmVQYXRoKX0pYFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gQWJzb2x1dGVQYXRoLmZpbGUocGF0aC5yZXNvbHZlKHRoaXMuI2ZpbGVuYW1lLCAuLi5yZWxhdGl2ZVBhdGgpKTtcbiAgfVxuXG4gIGRpcmVjdG9yeSguLi5yZWxhdGl2ZVBhdGg6IHJlYWRvbmx5IHN0cmluZ1tdKTogQWJzb2x1dGVQYXRoIHtcbiAgICBpZiAodGhpcy4ja2luZCA9PT0gXCJyZWd1bGFyXCIpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBgQ2Fubm90IGNyZWF0ZSBhIG5lc3RlZCBkaXJlY3RvcnkgaW5zaWRlIGEgcmVndWxhciBmaWxlIChwYXJlbnQ9JHtcbiAgICAgICAgICB0aGlzLiNmaWxlbmFtZVxuICAgICAgICB9LCBjaGlsZD0ke3BhdGguam9pbiguLi5yZWxhdGl2ZVBhdGgpfSlgXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBBYnNvbHV0ZVBhdGguZGlyZWN0b3J5KFxuICAgICAgcGF0aC5yZXNvbHZlKHRoaXMuI2ZpbGVuYW1lLCAuLi5yZWxhdGl2ZVBhdGgpXG4gICAgKTtcbiAgfVxuXG4gIHJlbGF0aXZlRnJvbUFuY2VzdG9yKGFuY2VzdG9yOiBBYnNvbHV0ZVBhdGgpIHtcbiAgICBpZiAoIWFuY2VzdG9yLmNvbnRhaW5zKHRoaXMpKSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgYENhbm5vdCBjb21wdXRlIGEgcmVsYXRpdmUgcGF0aCBmcm9tICR7YW5jZXN0b3IuI2ZpbGVuYW1lfSB0byAke1xuICAgICAgICAgIHRoaXMuI2ZpbGVuYW1lXG4gICAgICAgIH0sIGJlY2F1c2UgaXQgaXMgbm90IGFuIGFuY2VzdG9yYFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGF0aC5yZWxhdGl2ZShhbmNlc3Rvci4jZmlsZW5hbWUsIHRoaXMuI2ZpbGVuYW1lKTtcbiAgfVxuXG4gIGNvbnRhaW5zKG1heWJlQ2hpbGQ6IEFic29sdXRlUGF0aCk6IGJvb2xlYW4ge1xuICAgIGxldCByZWxhdGl2ZSA9IHBhdGgucmVsYXRpdmUodGhpcy4jZmlsZW5hbWUsIG1heWJlQ2hpbGQuI2ZpbGVuYW1lKTtcblxuICAgIHJldHVybiAhcmVsYXRpdmUuc3RhcnRzV2l0aChcIi5cIik7XG4gIH1cblxuICBlcShvdGhlcjogQWJzb2x1dGVQYXRoKSB7XG4gICAgcmV0dXJuIHRoaXMuI2ZpbGVuYW1lID09PSBvdGhlci4jZmlsZW5hbWU7XG4gIH1cblxuICBbSU5TUEVDVF0oY29udGV4dDogbnVsbCwgeyBzdHlsaXplIH06IHV0aWwuSW5zcGVjdE9wdGlvbnNTdHlsaXplZCkge1xuICAgIHJldHVybiBgJHtzdHlsaXplKFwiUGF0aFwiLCBcInNwZWNpYWxcIil9KCR7c3R5bGl6ZShcbiAgICAgIHRoaXMuI2ZpbGVuYW1lLFxuICAgICAgXCJtb2R1bGVcIlxuICAgICl9KWA7XG4gIH1cbn1cblxuY2xhc3MgUHJlcGFyZVRyYW5zcGlsYXRpb24ge1xuICByZWFkb25seSAjZmlsZXM6IERpZmZEYXRhPHN0cmluZz47XG4gIHJlYWRvbmx5ICNkaXJlY3RvcmllczogRGlmZkRhdGE8c3RyaW5nPjtcblxuICBjb25zdHJ1Y3RvcihmaWxlczogRGlmZkRhdGE8c3RyaW5nPiwgZGlyZWN0b3JpZXM6IERpZmZEYXRhPHN0cmluZz4pIHtcbiAgICB0aGlzLiNmaWxlcyA9IGZpbGVzO1xuICAgIHRoaXMuI2RpcmVjdG9yaWVzID0gZGlyZWN0b3JpZXM7XG4gIH1cblxuICBhc3luYyBwcmVwYXJlKCkge31cbn1cblxuY2xhc3MgVHJhbnNwaWxlVGFzayB7XG4gIHN0YXRpYyBjcmVhdGUoaW5wdXQ6IEFic29sdXRlUGF0aCwgb3V0cHV0OiBBYnNvbHV0ZVBhdGgpOiBUcmFuc3BpbGVUYXNrIHtcbiAgICByZXR1cm4gbmV3IFRyYW5zcGlsZVRhc2soaW5wdXQsIG91dHB1dCk7XG4gIH1cblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgIHJlYWRvbmx5IGlucHV0OiBBYnNvbHV0ZVBhdGgsXG4gICAgcmVhZG9ubHkgb3V0cHV0OiBBYnNvbHV0ZVBhdGhcbiAgKSB7fVxufVxuXG5hc3luYyBmdW5jdGlvbiB3b3Jrc3BhY2VQYWNrYWdlcyhyb290OiBzdHJpbmcsIGZpbHRlcjogc3RyaW5nKSB7XG4gIGxldCBzdGRvdXQgPSBhd2FpdCBleGVjKFxuICAgIHNoYHBucG0gbSBscyAtLWZpbHRlciAuLyR7ZmlsdGVyfSAtLWRlcHRoIC0xIC0tcG9yY2VsYWluYFxuICApO1xuXG4gIGlmIChzdGRvdXQgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIHJldHVybiBzdGRvdXRcbiAgICAuc3BsaXQoXCJcXG5cIilcbiAgICAuZmlsdGVyKChmaWxlKSA9PiBmaWxlICE9PSBcIlwiICYmIGZpbGUgIT09IHJvb3QpXG4gICAgLm1hcCgocCkgPT4gcGF0aC5yZWxhdGl2ZShyb290LCBwKSk7XG59XG5cbmludGVyZmFjZSBFeGVjRXJyb3JPcHRpb25zIGV4dGVuZHMgRXJyb3JPcHRpb25zIHtcbiAgY29kZTogbnVtYmVyIHwgbnVsbDtcbiAgY29tbWFuZDogc3RyaW5nO1xufVxuXG5jbGFzcyBFeGVjRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIHJlYWRvbmx5ICNjb2RlOiBudW1iZXIgfCBudWxsO1xuICByZWFkb25seSAjY29tbWFuZDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZywgb3B0aW9uczogRXhlY0Vycm9yT3B0aW9ucykge1xuICAgIHN1cGVyKG1lc3NhZ2UsIG9wdGlvbnMpO1xuXG4gICAgdGhpcy4jY29kZSA9IG9wdGlvbnMuY29kZTtcbiAgICB0aGlzLiNjb21tYW5kID0gb3B0aW9ucy5jb21tYW5kO1xuXG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XG4gIH1cblxuICBnZXQgY29kZSgpOiBudW1iZXIgfCBcInVua25vd25cIiB7XG4gICAgcmV0dXJuIHRoaXMuI2NvZGUgPz8gXCJ1bmtub3duXCI7XG4gIH1cblxuICBnZXQgbWVzc2FnZSgpOiBzdHJpbmcge1xuICAgIGxldCBtZXNzYWdlID0gc3VwZXIubWVzc2FnZTtcbiAgICBsZXQgaGVhZGVyID0gYEV4ZWMgRmFpbGVkIHdpdGggY29kZT0ke3RoaXMuY29kZX1cXG4gIChpbiAke3RoaXMuI2NvbW1hbmR9KWA7XG5cbiAgICBpZiAobWVzc2FnZSkge1xuICAgICAgcmV0dXJuIGAke2hlYWRlcn1cXG5cXG4ke21lc3NhZ2V9YDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGhlYWRlcjtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZXhlYyhjb21tYW5kOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKGZ1bGZpbGwsIHJlamVjdCkgPT4ge1xuICAgIGxldCBjaGlsZCA9IHNoZWxsLmV4ZWMoY29tbWFuZCwgeyBzaWxlbnQ6IHRydWUsIGFzeW5jOiB0cnVlIH0pO1xuXG4gICAgbGV0IHN0ZG91dCA9IHJlYWRBbGwoY2hpbGQuc3Rkb3V0KTtcbiAgICBsZXQgc3RkZXJyID0gcmVhZEFsbChjaGlsZC5zdGRlcnIpO1xuXG4gICAgY2hpbGQub24oXCJlcnJvclwiLCAoZXJyKSA9PiByZWplY3QoZXJyKSk7XG4gICAgY2hpbGQub24oXCJleGl0XCIsIGFzeW5jIChjb2RlKSA9PiB7XG4gICAgICBsb2coXCJleGVjIHN0YXR1c1wiLCB7IGNvZGUsIHN0ZG91dDogYXdhaXQgc3Rkb3V0IH0pO1xuXG4gICAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgICBmdWxmaWxsKGF3YWl0IHN0ZG91dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2coXCJleGVjIGVycm9yXCIsIHtcbiAgICAgICAgICBlcnJvcjogYXdhaXQgc3RkZXJyLFxuICAgICAgICAgIG91dDogYXdhaXQgc3Rkb3V0LFxuICAgICAgICAgIGNvZGUsXG4gICAgICAgICAgY29tbWFuZCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJlamVjdChuZXcgRXhlY0Vycm9yKChhd2FpdCBzdGRlcnIpID8/IFwiXCIsIHsgY29kZSwgY29tbWFuZCB9KSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufVxuXG5pbnRlcmZhY2UgUmVhZGFibGVTdHJlYW0gZXh0ZW5kcyBOb2RlSlMuUmVhZGFibGVTdHJlYW0ge1xuICBjbG9zZWQ/OiBib29sZWFuO1xuICBkZXN0cm95ZWQ/OiBib29sZWFuO1xuICBkZXN0cm95PygpOiB2b2lkO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZWFkQWxsKFxuICByZWFkYWJsZT86IFJlYWRhYmxlU3RyZWFtIHwgbnVsbFxuKTogUHJvbWlzZTxzdHJpbmcgfCB1bmRlZmluZWQ+IHtcbiAgaWYgKHJlYWRhYmxlID09PSB1bmRlZmluZWQgfHwgcmVhZGFibGUgPT09IG51bGwpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBsZXQgcmVzdWx0ID0gYXdhaXQgbmV3IFByb21pc2VSZWFkYWJsZShyZWFkYWJsZSkucmVhZEFsbCgpO1xuXG4gIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHJlc3VsdCA9PT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHJlc3VsdC50b1N0cmluZyhcInV0Zi04XCIpO1xuICB9XG59XG5cbmNvbnN0IFBBUlRTX01BVENIRVIgPSAvXig/PGZpbGU+W14uXSopKD86Wy5dKD88ZXh0Pi4qKSk/JC87XG5cbmludGVyZmFjZSBGaWxlUGFydHMge1xuICByZWFkb25seSBwYXJlbnQ6IHN0cmluZyB8IG51bGw7XG4gIHJlYWRvbmx5IGJhc2VuYW1lOiB7XG4gICAgcmVhZG9ubHkgZmlsZTogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGV4dDogc3RyaW5nIHwgbnVsbDtcbiAgfTtcbiAgcmVhZG9ubHkga2luZD86IEFic29sdXRlUGF0aEtpbmQ7XG59XG5cbmZ1bmN0aW9uIGdldFBhcnRzKGZpbGVuYW1lOiBzdHJpbmcpOiBGaWxlUGFydHMge1xuICBsZXQgcGFyZW50ID0gZ2V0UGFyZW50KGZpbGVuYW1lKTtcbiAgbGV0IGJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlbmFtZSk7XG5cbiAgbGV0IGV4dGVuc2lvbiA9IGJhc2VuYW1lLm1hdGNoKFBBUlRTX01BVENIRVIpO1xuXG4gIGlmIChleHRlbnNpb24gPT09IG51bGwpIHtcbiAgICByZXR1cm4geyBwYXJlbnQsIGJhc2VuYW1lOiB7IGZpbGU6IGJhc2VuYW1lLCBleHQ6IG51bGwgfSB9O1xuICB9XG5cbiAgbGV0IHsgZmlsZSwgZXh0IH0gPSBleHRlbnNpb24uZ3JvdXBzITtcblxuICByZXR1cm4ge1xuICAgIHBhcmVudCxcbiAgICBiYXNlbmFtZTogeyBmaWxlLCBleHQgfSxcbiAgICBraW5kOiBwYXJlbnQgPT09IG51bGwgPyBcInJvb3RcIiA6IHVuZGVmaW5lZCxcbiAgfTtcblxuICAvLyBsZXQgWywgYmFzZW5hbWUsIGV4dG5hbWVdO1xufVxuXG5mdW5jdGlvbiBnZXRQYXJlbnQoZmlsZW5hbWU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBsZXQgcGFyZW50ID0gcGF0aC5kaXJuYW1lKGZpbGVuYW1lKTtcbiAgbGV0IHJvb3QgPSBwYXRoLnBhcnNlKHBhcmVudCkucm9vdDtcblxuICBpZiAoZmlsZW5hbWUgPT09IHJvb3QpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcGFyZW50O1xuICB9XG59XG5cbmZ1bmN0aW9uIGNoYW5nZUV4dGVuc2lvbihmaWxlOiBzdHJpbmcsIHRvOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBiYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZSwgcGF0aC5leHRuYW1lKGZpbGUpKTtcbiAgcmV0dXJuIHBhdGguam9pbihwYXRoLmRpcm5hbWUoZmlsZSksIGAke2Jhc2VuYW1lfS4ke3RvfWApO1xufVxuXG5mdW5jdGlvbiBleGhhdXN0aXZlKHZhbHVlOiBuZXZlciwgZGVzY3JpcHRpb246IHN0cmluZyk6IG5ldmVyIHtcbiAgdGhyb3cgRXJyb3IoYEV4cGVjdGVkICR7ZGVzY3JpcHRpb259IHRvIGJlIGV4aGF1c3RpdmVseSBjaGVja2VkYCk7XG59XG5cbmZ1bmN0aW9uIGxvZyguLi5hcmdzOiBbdmFsdWU6IHVua25vd25dIHwgW2xhYmVsOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duXSkge1xuICBpZiAoYXJncy5sZW5ndGggPT09IDIpIHtcbiAgICBsZXQgW2xhYmVsLCB2YWx1ZV0gPSBhcmdzO1xuICAgIGNvbnNvbGUubG9nKGxhYmVsLCB1dGlsLmluc3BlY3QodmFsdWUsIHsgZGVwdGg6IG51bGwsIGNvbG9yczogdHJ1ZSB9KSk7XG4gIH0gZWxzZSB7XG4gICAgbGV0IFt2YWx1ZV0gPSBhcmdzO1xuICAgIGNvbnNvbGUubG9nKHV0aWwuaW5zcGVjdCh2YWx1ZSwgeyBkZXB0aDogbnVsbCwgY29sb3JzOiB0cnVlIH0pKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBsb2dnZWQ8VD4odmFsdWU6IFQsIGRlc2NyaXB0aW9uOiBzdHJpbmcpOiBUIHtcbiAgY29uc29sZS5sb2coXG4gICAgZGVzY3JpcHRpb24sXG4gICAgXCI9XCIsXG4gICAgdXRpbC5pbnNwZWN0KHZhbHVlLCB7IGRlcHRoOiBudWxsLCBjb2xvcnM6IHRydWUgfSlcbiAgKTtcbiAgcmV0dXJuIHZhbHVlO1xufVxuIl19