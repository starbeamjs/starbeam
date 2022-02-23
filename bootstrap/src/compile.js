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
    async compile({ dryRun } = { dryRun: false }) {
        // let root = this.root;
        // let dist = path.join(this.root, "dist");
        let transpilation = await this.#packageTranspilation();
        let prepare = transpilation.prepare(await this.#getDistFiles());
        prepare.run({ dryRun });
        // console.log({ files, directories });
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
        let files = await AbsolutePaths.glob(`!(node_modules|dist)**/*.ts`, this.root);
        let dts = files.filter((file) => file.hasExactExtension("d.ts"));
        for (let file of dts) {
            console.warn(`Unexpected .d.ts file found during compilation (${file})`);
        }
        let ts = files
            .filter((file) => file.hasExactExtension("ts"))
            .filter((file) => !file.eq(this.root));
        log.silent.inspect.labeled(`[TS-FILES]`, ts);
        return Transpilation.create(this.name, ts.mapArray((file) => this.#fileTranspilation(file)));
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
        log.silent.inspect.labeled(`[TRANSPILE]`, {
            input: inputPath,
            root: this.root,
            relative: relativePath,
        });
        let output = this.#dist.file(relativePath).changeExtension("js");
        log.silent.inspect.labeled(`[OUTPUT]`, output);
        return TranspileTask.create(inputPath, output);
    }
}
class Transpilation {
    static create(name, tasks) {
        return new Transpilation(name, tasks);
    }
    #name;
    #tasks;
    constructor(name, tasks) {
        this.#name = name;
        this.#tasks = tasks;
    }
    prepare(existing) {
        return PrepareTranspilation.create(this.#name, existing.diffByKind(this.outputPaths));
    }
    get outputPaths() {
        let files = AbsolutePaths.from(this.#tasks.map((task) => task.output));
        log.silent.inspect.labeled("[OUT-FILES]", files);
        let directories = files.directory;
        log.silent.inspect.labeled("[OUT-DIRS]", files.directory);
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
        let added = AbsolutePaths.from(diffs.added);
        let removed = AbsolutePaths.from(diffs.removed).filter((path) => !added.has(path));
        return {
            added,
            removed,
        };
    }
    /**
     * This method diffs files and directories, but excludes any removed files
     * that are descendents of a removed directory.
     */
    diffByKind(other) {
        let directories = this.directories.diff(other.directories);
        log
            .newline()
            .heading("Directories")
            .newline()
            .inspect.labeled("[LHS]", this.directories)
            .newline()
            .inspect.labeled("[RHS]", other.directories)
            .newline()
            .inspect.labeled("[DIFF]", directories);
        let collapsedDirectories = directories.removed.collapsedDirectories();
        log.silent.newline().inspect.labeled("[CLPS]", collapsedDirectories);
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
            console.log({ path, rest });
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
        let entries = [...this.#paths.entries()].sort(([a], [b]) => b.length - a.length);
        return new Map(entries);
    }
    /**
     * Iterate the paths in this set. Larger paths come first.
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
        let { parent, basename: { file }, } = getParts(this.#filename);
        let renamed = `${file}.${extension}`;
        if (parent) {
            return AbsolutePath.file(path.resolve(parent, renamed));
        }
        else {
            return AbsolutePath.file(renamed);
        }
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
        log.silent.inspect.labeled(`[FILE]`, {
            resolved: path.resolve(this.#filename, ...relativePath),
            path: AbsolutePath.file(path.resolve(this.#filename, ...relativePath)),
        });
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
    static create(name, diff) {
        return new PrepareTranspilation(name, diff);
    }
    #name;
    #diff;
    constructor(name, diff) {
        this.#name = name;
        this.#diff = diff;
    }
    async run({ dryRun } = { dryRun: false }) {
        let { directories, files } = this.#diff;
        if (dryRun) {
            log
                .newline()
                .log("[DRY-RUN]", this.#name)
                .newline()
                .heading("[DRY-RUN]", "Directories");
            for (let removed of directories.removed) {
                log.silent.inspect.labeled("  [--]", removed);
            }
            for (let added of directories.added) {
                log.silent.inspect.labeled("  [++]", added);
            }
            log.silent.newline().heading("[DRY-RUN]", "Files");
            for (let removed of files.removed) {
                log.silent.inspect.labeled("  [--]", removed);
            }
            for (let added of files.added) {
                log.silent.inspect.labeled("  [++]", added);
            }
        }
    }
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
const LABEL = Symbol("LABEL");
function Label(...label) {
    return { [LABEL]: label };
}
function isLabel(value) {
    return typeof value === "object" && value !== null && LABEL in value;
}
const SILENT = (() => {
    const log = (...args) => SILENT;
    log.log = log;
    log.silent = log;
    log.newline = () => log;
    log.heading = (...label) => log;
    const inspect = (value, options) => log;
    inspect.labeled = (...args) => log;
    log.inspect = inspect;
    return log;
})();
function log(...args) {
    if (args.length === 2) {
        let [label, value] = args;
        console.log(label, util.inspect(value, { depth: null, colors: true }));
    }
    else {
        let [value] = args;
        if (isLabel(value)) {
            console.log(...value[LABEL]);
        }
        else {
            console.log(util.inspect(value, { depth: null, colors: true }));
        }
    }
    return log;
}
log.silent = log;
log.log = log;
log.newline = () => {
    console.log("\n");
    return log;
};
log.heading = (...label) => {
    console.log(...label);
    return log;
};
const logLabeled = (label, value, options) => {
    logLabeledValue(label, value, options);
    return log;
};
const logInspect = (value, options) => {
    console.log(inspect(value, options));
    return log;
};
logInspect.labeled = logLabeled;
log.inspect = logInspect;
function logLabeledValue(label, value, options = {}) {
    if (isLabel(label)) {
        console.log(...label[LABEL], inspect(value, options));
    }
    else {
        console.log(label, inspect(value, options));
    }
}
function inspect(value, options = {}) {
    return util.inspect(value, { ...options, depth: null, colors: true });
}
function logged(value, description, shouldLog = true) {
    if (shouldLog) {
        console.log(description, "=", util.inspect(value, { depth: null, colors: true }));
    }
    return value;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbXBpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sVUFBVSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNsQyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ2xDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNuRCxPQUFPLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNsQyxPQUFPLEtBQUssTUFBTSxTQUFTLENBQUM7QUFDNUIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFFN0IsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUVoRSxNQUFNLE9BQU8sU0FBUztJQUNwQjs7T0FFRztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQVksRUFBRSxTQUFpQjtRQUNqRCxJQUFJLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVyRCxJQUFJLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQzlCLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQzlCLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3pELElBQUksR0FBRyxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUM1RCxJQUFJ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RSxPQUFPLENBQUMsQ0FBQyxDQUFDO0tBQzdDO0FBQ0gsQ0FBQztBQUVELFNBQVMsT0FBTyxDQUFDLEtBQWMsRUFBRSxVQUErQixFQUFFO0lBQ2hFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxHQUFHLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3hFLENBQUM7QUFFRCxTQUFTLE1BQU0sQ0FBSSxLQUFRLEVBQUUsV0FBbUIsRUFBRSxTQUFTLEdBQUcsSUFBSTtJQUNoRSxJQUFJLFNBQVMsRUFBRTtRQUNiLE9BQU8sQ0FBQyxHQUFHLENBQ1QsV0FBVyxFQUNYLEdBQUcsRUFDSCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQ25ELENBQUM7S0FDSDtJQUNELE9BQU8sS0FBSyxDQUFDO0FBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGRpZmYgfSBmcm9tIFwiZmFzdC1hcnJheS1kaWZmXCI7XG5pbXBvcnQgc2VhcmNoR2xvYiBmcm9tIFwiZmFzdC1nbG9iXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnMvcHJvbWlzZXNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IGlzQWJzb2x1dGUgfSBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgUHJvbWlzZVJlYWRhYmxlIH0gZnJvbSBcInByb21pc2UtcmVhZGFibGVcIjtcbmltcG9ydCBzaCBmcm9tIFwic2hlbGwtZXNjYXBlLXRhZ1wiO1xuaW1wb3J0IHNoZWxsIGZyb20gXCJzaGVsbGpzXCI7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gXCJ1dGlsXCI7XG5cbmV4cG9ydCBjb25zdCBJTlNQRUNUID0gU3ltYm9sLmZvcihcIm5vZGVqcy51dGlsLmluc3BlY3QuY3VzdG9tXCIpO1xuXG5leHBvcnQgY2xhc3MgV29ya3NwYWNlIHtcbiAgLyoqXG4gICAqIEBwYXJhbSByb290IHRoZSByb290IG9mIHRoZSB3b3Jrc3BhY2UsIGFzIGFuIGFic29sdXRlIGRpcmVjdG9yeVxuICAgKi9cbiAgc3RhdGljIGFzeW5jIGNyZWF0ZShyb290OiBzdHJpbmcsIG5hbWVzcGFjZTogc3RyaW5nKSB7XG4gICAgbGV0IHBhdGhzID0gYXdhaXQgd29ya3NwYWNlUGFja2FnZXMocm9vdCwgbmFtZXNwYWNlKTtcblxuICAgIGxldCBwYWNrYWdlcyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgcGF0aHMubWFwKGFzeW5jIChwYWNrYWdlUm9vdCkgPT4ge1xuICAgICAgICBsZXQgbWFuaWZlc3QgPSBwYXRoLnJlc29sdmUocGFja2FnZVJvb3QsIFwicGFja2FnZS5qc29uXCIpO1xuICAgICAgICBsZXQgYnVmID0gYXdhaXQgZnMucmVhZEZpbGUobWFuaWZlc3QsIHsgZW5jb2Rpbmc6IFwidXRmOFwiIH0pO1xuICAgICAgICBsZXQganNvbjogSnNvbk9iamVjdCA9IEpTT04ucGFyc2UoYnVmKTtcblxuICAgICAgICBsZXQgcm9vdCA9IHBhdGguZGlybmFtZShtYW5pZmVzdCk7XG4gICAgICAgIGxldCBuYW1lID0gcGF0aC5iYXNlbmFtZShyb290KTtcblxuICAgICAgICByZXR1cm4gUGFja2FnZS5jcmVhdGUoKCkgPT4gd29ya3NwYWNlLCBuYW1lLCBqc29uKTtcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIGNvbnN0IHdvcmtzcGFjZTogV29ya3NwYWNlID0gbmV3IFdvcmtzcGFjZShyb290LCBuYW1lc3BhY2UsIHBhY2thZ2VzKTtcbiAgICByZXR1cm4gd29ya3NwYWNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBucG0gbmFtZXNwYWNlIChlLmcuIHRoZSAjbmFtZXNwYWNlIG9mIGBAc3RhcmJlYW0vY29yZWAgaXMgYEBzdGFyYmVhbWApXG4gICAqL1xuICByZWFkb25seSAjbmFtZXNwYWNlOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgcm9vdCBvZiB0aGUgd29ya3NwYWNlLCBhcyBhbiBhYnNvbHV0ZSBkaXJlY3RvcnlcbiAgICovXG4gIHJlYWRvbmx5ICNyb290OiBzdHJpbmc7XG5cbiAgI3BhY2thZ2VzOiByZWFkb25seSBQYWNrYWdlW107XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICByb290OiBzdHJpbmcsXG4gICAgbmFtZXNwYWNlOiBzdHJpbmcsXG4gICAgcGFja2FnZXM6IHJlYWRvbmx5IFBhY2thZ2VbXVxuICApIHtcbiAgICB0aGlzLiNyb290ID0gcm9vdDtcbiAgICB0aGlzLiNuYW1lc3BhY2UgPSBuYW1lc3BhY2U7XG4gICAgdGhpcy4jcGFja2FnZXMgPSBwYWNrYWdlcztcbiAgfVxuXG4gIGdldCByb290KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI3Jvb3Q7XG4gIH1cblxuICBnZXQgcGFja2FnZXMoKTogcmVhZG9ubHkgUGFja2FnZVtdIHtcbiAgICByZXR1cm4gdGhpcy4jcGFja2FnZXM7XG4gIH1cblxuICBnZXQgbmFtZXNwYWNlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI25hbWVzcGFjZTtcbiAgfVxufVxuXG50eXBlIEpzb25WYWx1ZSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsIHwgSnNvbkFycmF5IHwgSnNvbk9iamVjdDtcbnR5cGUgSnNvbkFycmF5ID0gcmVhZG9ubHkgSnNvblZhbHVlW107XG50eXBlIEpzb25PYmplY3QgPSB7IFtQIGluIHN0cmluZ106IEpzb25WYWx1ZSB9O1xuXG5jbGFzcyBQYWNrYWdlIHtcbiAgc3RhdGljIGNyZWF0ZShcbiAgICB3b3Jrc3BhY2U6ICgpID0+IFdvcmtzcGFjZSxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgbWFuaWZlc3Q6IEpzb25PYmplY3RcbiAgKTogUGFja2FnZSB7XG4gICAgcmV0dXJuIG5ldyBQYWNrYWdlKHdvcmtzcGFjZSwgbmFtZSwgbWFuaWZlc3QpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSB3b3Jrc3BhY2UgdGhhdCB0aGlzIHBhY2thZ2UgYmVsb25ncyB0by4gSXQncyBhIHRodW5rIGJlY2F1c2Ugd29ya3NwYWNlc1xuICAgKiBhbmQgcGFja2FnZXMgYXJlIGN5Y2xpYyBhbmQgaGF2ZSB0byBiZSBpbml0aWFsaXplZCB0b2dldGhlci5cbiAgICovXG4gIHJlYWRvbmx5ICN3b3Jrc3BhY2VUaHVuazogKCkgPT4gV29ya3NwYWNlO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgcGFja2FnZS4gRm9yIGV4YW1wbGUsIGAjbmFtZWAgb2YgYEBzdGFyYmVhbS9jb3JlYCBpcyBgY29yZWBcbiAgICovXG4gIHJlYWRvbmx5ICNsb2NhbE5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHBhcnNlZCBwYWNrYWdlLmpzb25cbiAgICovXG4gIHJlYWRvbmx5ICNtYW5pZmVzdDogSnNvbk9iamVjdDtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgIHdvcmtzcGFjZTogKCkgPT4gV29ya3NwYWNlLFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBtYW5pZmVzdDogSnNvbk9iamVjdFxuICApIHtcbiAgICB0aGlzLiN3b3Jrc3BhY2VUaHVuayA9IHdvcmtzcGFjZTtcbiAgICB0aGlzLiNsb2NhbE5hbWUgPSBuYW1lO1xuICAgIHRoaXMuI21hbmlmZXN0ID0gbWFuaWZlc3Q7XG4gIH1cblxuICBnZXQgI3dvcmtzcGFjZSgpOiBXb3Jrc3BhY2Uge1xuICAgIHJldHVybiB0aGlzLiN3b3Jrc3BhY2VUaHVuaygpO1xuICB9XG5cbiAgZ2V0IG5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dGhpcy4jd29ya3NwYWNlLm5hbWVzcGFjZX0vJHt0aGlzLiNsb2NhbE5hbWV9YDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcm9vdCBvZiB0aGlzIHBhY2thZ2UsIHdoaWNoIGNvbnRhaW5zIHRoZSBwYWNrYWdlLmpzb25cbiAgICovXG4gIGdldCByb290KCk6IEFic29sdXRlUGF0aCB7XG4gICAgcmV0dXJuIEFic29sdXRlUGF0aC5kaXJlY3RvcnkoXG4gICAgICBwYXRoLnJlc29sdmUoXG4gICAgICAgIHRoaXMuI3dvcmtzcGFjZS5yb290LFxuICAgICAgICB0aGlzLiN3b3Jrc3BhY2UubmFtZXNwYWNlLFxuICAgICAgICB0aGlzLiNsb2NhbE5hbWVcbiAgICAgIClcbiAgICApO1xuICB9XG5cbiAgZ2V0IHBhY2thZ2VKU09OKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHBhdGgucmVzb2x2ZSh0aGlzLiN3b3Jrc3BhY2Uucm9vdCk7XG4gIH1cblxuICBhc3luYyBjb21waWxlKHsgZHJ5UnVuIH06IHsgZHJ5UnVuOiBib29sZWFuIH0gPSB7IGRyeVJ1bjogZmFsc2UgfSkge1xuICAgIC8vIGxldCByb290ID0gdGhpcy5yb290O1xuICAgIC8vIGxldCBkaXN0ID0gcGF0aC5qb2luKHRoaXMucm9vdCwgXCJkaXN0XCIpO1xuXG4gICAgbGV0IHRyYW5zcGlsYXRpb24gPSBhd2FpdCB0aGlzLiNwYWNrYWdlVHJhbnNwaWxhdGlvbigpO1xuICAgIGxldCBwcmVwYXJlID0gdHJhbnNwaWxhdGlvbi5wcmVwYXJlKGF3YWl0IHRoaXMuI2dldERpc3RGaWxlcygpKTtcblxuICAgIHByZXBhcmUucnVuKHsgZHJ5UnVuIH0pO1xuXG4gICAgLy8gY29uc29sZS5sb2coeyBmaWxlcywgZGlyZWN0b3JpZXMgfSk7XG5cbiAgICAvLyBmb3IgKGxldCB0YXNrIG9mIGZpbGVzKSB7XG4gICAgLy8gICAvLyBjb25zb2xlLmxvZyh0YXNrKTtcbiAgICAvLyB9XG5cbiAgICAvLyBsZXQgZmlsZXMgPSBhd2FpdCBnbG9iKGAke3Jvb3R9LyEobm9kZV9tb2R1bGVzKSoqLyoudHNgKTtcblxuICAgIC8vIC8vIGNvbnNvbGUubG9nKHsgZmlsZXMgfSk7XG5cbiAgICAvLyBmb3IgKGxldCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgLy8gICBpZiAoZmlsZS5lbmRzV2l0aChcIi5kLnRzXCIpKSB7XG4gICAgLy8gICAgIGNvbnNvbGUud2FybihcbiAgICAvLyAgICAgICBgVW5leHBlY3RlZCAuZC50cyBmaWxlIGZvdW5kIGR1cmluZyBjb21waWxhdGlvbiAoJHtmaWxlfSlgXG4gICAgLy8gICAgICk7XG4gICAgLy8gICAgIGNvbnRpbnVlO1xuICAgIC8vICAgfVxuXG4gICAgLy8gICBsZXQgcmVsYXRpdmUgPSBwYXRoLnJlbGF0aXZlKHJvb3QsIGZpbGUpO1xuICAgIC8vICAgbGV0IG91dHB1dCA9IGF3YWl0IHN3Yy50cmFuc2Zvcm1GaWxlKGZpbGUsIHtcbiAgICAvLyAgICAgc291cmNlTWFwczogXCJpbmxpbmVcIixcbiAgICAvLyAgICAgaW5saW5lU291cmNlc0NvbnRlbnQ6IHRydWUsXG4gICAgLy8gICAgIGpzYzoge1xuICAgIC8vICAgICAgIHBhcnNlcjoge1xuICAgIC8vICAgICAgICAgc3ludGF4OiBcInR5cGVzY3JpcHRcIixcbiAgICAvLyAgICAgICAgIGRlY29yYXRvcnM6IHRydWUsXG4gICAgLy8gICAgICAgfSxcbiAgICAvLyAgICAgICB0YXJnZXQ6IFwiZXMyMDIyXCIsXG4gICAgLy8gICAgIH0sXG4gICAgLy8gICB9KTtcblxuICAgIC8vICAgbGV0IHRhcmdldCA9IGNoYW5nZUV4dGVuc2lvbihgJHtkaXN0fS8ke3JlbGF0aXZlfWAsIFwianNcIik7XG5cbiAgICAvLyAgIHNoZWxsLm1rZGlyKFwiLXBcIiwgcGF0aC5kaXJuYW1lKHRhcmdldCkpO1xuXG4gICAgLy8gICBmcy53cml0ZUZpbGUodGFyZ2V0LCBvdXRwdXQuY29kZSk7XG4gICAgLy8gfVxuICB9XG5cbiAgZ2V0ICNkaXN0KCk6IEFic29sdXRlUGF0aCB7XG4gICAgcmV0dXJuIHRoaXMucm9vdC5kaXJlY3RvcnkoXCJkaXN0XCIpO1xuICB9XG5cbiAgYXN5bmMgI3BhY2thZ2VUcmFuc3BpbGF0aW9uKCk6IFByb21pc2U8VHJhbnNwaWxhdGlvbj4ge1xuICAgIGxldCBmaWxlcyA9IGF3YWl0IEFic29sdXRlUGF0aHMuZ2xvYihcbiAgICAgIGAhKG5vZGVfbW9kdWxlc3xkaXN0KSoqLyoudHNgLFxuICAgICAgdGhpcy5yb290XG4gICAgKTtcblxuICAgIGxldCBkdHMgPSBmaWxlcy5maWx0ZXIoKGZpbGUpID0+IGZpbGUuaGFzRXhhY3RFeHRlbnNpb24oXCJkLnRzXCIpKTtcblxuICAgIGZvciAobGV0IGZpbGUgb2YgZHRzKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFVuZXhwZWN0ZWQgLmQudHMgZmlsZSBmb3VuZCBkdXJpbmcgY29tcGlsYXRpb24gKCR7ZmlsZX0pYCk7XG4gICAgfVxuXG4gICAgbGV0IHRzID0gZmlsZXNcbiAgICAgIC5maWx0ZXIoKGZpbGUpID0+IGZpbGUuaGFzRXhhY3RFeHRlbnNpb24oXCJ0c1wiKSlcbiAgICAgIC5maWx0ZXIoKGZpbGUpID0+ICFmaWxlLmVxKHRoaXMucm9vdCkpO1xuXG4gICAgbG9nLnNpbGVudC5pbnNwZWN0LmxhYmVsZWQoYFtUUy1GSUxFU11gLCB0cyk7XG5cbiAgICByZXR1cm4gVHJhbnNwaWxhdGlvbi5jcmVhdGUoXG4gICAgICB0aGlzLm5hbWUsXG4gICAgICB0cy5tYXBBcnJheSgoZmlsZSkgPT4gdGhpcy4jZmlsZVRyYW5zcGlsYXRpb24oZmlsZSkpXG4gICAgKTtcblxuICAgIC8vIGxldCBmaWxlcyA9IGF3YWl0IGdsb2IoYCR7dGhpcy5yb290fS8hKG5vZGVfbW9kdWxlcykqKi8qLnRzYCk7XG5cbiAgICAvLyBmb3IgKGxldCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgLy8gICBpZiAoZmlsZS5lbmRzV2l0aChcIi5kLnRzXCIpKSB7XG4gICAgLy8gICAgIGNvbnNvbGUud2FybihcbiAgICAvLyAgICAgICBgVW5leHBlY3RlZCAuZC50cyBmaWxlIGZvdW5kIGR1cmluZyBjb21waWxhdGlvbiAoJHtmaWxlfSlgXG4gICAgLy8gICAgICk7XG4gICAgLy8gICB9XG4gICAgLy8gfVxuXG4gICAgLy8gbGV0IHRhc2tzID0gZmlsZXNcbiAgICAvLyAgIC5maWx0ZXIoKGZpbGUpID0+ICFmaWxlLnN0YXJ0c1dpdGgodGhpcy4jZGlzdCkpXG4gICAgLy8gICAuZmlsdGVyKChmaWxlKSA9PiAhZmlsZS5lbmRzV2l0aChcIi5kLnRzXCIpKVxuICAgIC8vICAgLm1hcCgoZmlsZSkgPT4gdGhpcy4jZmlsZVRyYW5zcGlsYXRpb24oZmlsZSkpO1xuXG4gICAgLy8gcmV0dXJuIFRyYW5zcGlsYXRpb24uY3JlYXRlKHRhc2tzKTtcbiAgfVxuXG4gIGFzeW5jICNnZXREaXN0RmlsZXMoKTogUHJvbWlzZTxBYnNvbHV0ZVBhdGhzPiB7XG4gICAgcmV0dXJuIHRoaXMuI2Rpc3QuZ2xvYihcIioqXCIsIHsga2luZDogXCJhbGxcIiB9KTtcbiAgfVxuXG4gICNmaWxlVHJhbnNwaWxhdGlvbihpbnB1dFBhdGg6IEFic29sdXRlUGF0aCk6IFRyYW5zcGlsZVRhc2sge1xuICAgIGxldCByZWxhdGl2ZVBhdGggPSBpbnB1dFBhdGgucmVsYXRpdmVGcm9tQW5jZXN0b3IodGhpcy5yb290KTtcblxuICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKGBbVFJBTlNQSUxFXWAsIHtcbiAgICAgIGlucHV0OiBpbnB1dFBhdGgsXG4gICAgICByb290OiB0aGlzLnJvb3QsXG4gICAgICByZWxhdGl2ZTogcmVsYXRpdmVQYXRoLFxuICAgIH0pO1xuXG4gICAgbGV0IG91dHB1dCA9IHRoaXMuI2Rpc3QuZmlsZShyZWxhdGl2ZVBhdGgpLmNoYW5nZUV4dGVuc2lvbihcImpzXCIpO1xuXG4gICAgbG9nLnNpbGVudC5pbnNwZWN0LmxhYmVsZWQoYFtPVVRQVVRdYCwgb3V0cHV0KTtcblxuICAgIHJldHVybiBUcmFuc3BpbGVUYXNrLmNyZWF0ZShpbnB1dFBhdGgsIG91dHB1dCk7XG4gIH1cbn1cblxuY2xhc3MgVHJhbnNwaWxhdGlvbiB7XG4gIHN0YXRpYyBjcmVhdGUobmFtZTogc3RyaW5nLCB0YXNrczogcmVhZG9ubHkgVHJhbnNwaWxlVGFza1tdKSB7XG4gICAgcmV0dXJuIG5ldyBUcmFuc3BpbGF0aW9uKG5hbWUsIHRhc2tzKTtcbiAgfVxuXG4gIHJlYWRvbmx5ICNuYW1lOiBzdHJpbmc7XG4gIHJlYWRvbmx5ICN0YXNrczogcmVhZG9ubHkgVHJhbnNwaWxlVGFza1tdO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCB0YXNrczogcmVhZG9ubHkgVHJhbnNwaWxlVGFza1tdKSB7XG4gICAgdGhpcy4jbmFtZSA9IG5hbWU7XG4gICAgdGhpcy4jdGFza3MgPSB0YXNrcztcbiAgfVxuXG4gIHByZXBhcmUoZXhpc3Rpbmc6IEFic29sdXRlUGF0aHMpOiBQcmVwYXJlVHJhbnNwaWxhdGlvbiB7XG4gICAgcmV0dXJuIFByZXBhcmVUcmFuc3BpbGF0aW9uLmNyZWF0ZShcbiAgICAgIHRoaXMuI25hbWUsXG4gICAgICBleGlzdGluZy5kaWZmQnlLaW5kKHRoaXMub3V0cHV0UGF0aHMpXG4gICAgKTtcbiAgfVxuXG4gIGdldCBvdXRwdXRQYXRocygpOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICBsZXQgZmlsZXMgPSBBYnNvbHV0ZVBhdGhzLmZyb20odGhpcy4jdGFza3MubWFwKCh0YXNrKSA9PiB0YXNrLm91dHB1dCkpO1xuICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKFwiW09VVC1GSUxFU11cIiwgZmlsZXMpO1xuICAgIGxldCBkaXJlY3RvcmllcyA9IGZpbGVzLmRpcmVjdG9yeTtcbiAgICBsb2cuc2lsZW50Lmluc3BlY3QubGFiZWxlZChcIltPVVQtRElSU11cIiwgZmlsZXMuZGlyZWN0b3J5KTtcblxuICAgIHJldHVybiBmaWxlcy5tZXJnZShkaXJlY3Rvcmllcyk7XG4gIH1cbn1cblxuYWJzdHJhY3QgY2xhc3MgTWFwcGFibGU8U2luZ2xlLCBNdWx0aXBsZT4ge1xuICBhYnN0cmFjdCBtYXAobWFwcGVyOiAocGF0aDogU2luZ2xlKSA9PiBTaW5nbGUgfCBudWxsKTogTXVsdGlwbGU7XG5cbiAgYWJzdHJhY3QgZmxhdE1hcChcbiAgICBtYXBwZXI6IChwYXRoOiBTaW5nbGUpID0+IHJlYWRvbmx5IFNpbmdsZVtdIHwgTXVsdGlwbGUgfCBTaW5nbGVcbiAgKTogTXVsdGlwbGU7XG5cbiAgYWJzdHJhY3QgZmluZChmaW5kZXI6IChwYXRoOiBTaW5nbGUpID0+IGJvb2xlYW4pOiBTaW5nbGUgfCB2b2lkO1xuXG4gIGFic3RyYWN0IHJlZHVjZTxVPihcbiAgICBtYXBwZXI6IChidWlsZDogVSwgcGF0aDogU2luZ2xlKSA9PiB2b2lkLFxuICAgIGJ1aWxkOiBVLFxuICAgIHN0cmF0ZWd5OiBcIm11dGF0ZVwiXG4gICk6IFU7XG4gIGFic3RyYWN0IHJlZHVjZTxVPihcbiAgICBtYXBwZXI6IChhY2N1bXVsYXRvcjogVSwgcGF0aDogU2luZ2xlKSA9PiB2b2lkLFxuICAgIGluaXRpYWw6IFUsXG4gICAgc3RyYXRlZ3k/OiBcImZ1bmN0aW9uYWxcIlxuICApOiBVO1xuXG4gIGZpbHRlcihmaWx0ZXI6IChpdGVtOiBTaW5nbGUpID0+IGJvb2xlYW4pOiBNdWx0aXBsZSB7XG4gICAgcmV0dXJuIHRoaXMubWFwKChzaW5nbGUpID0+IChmaWx0ZXIoc2luZ2xlKSA/IHNpbmdsZSA6IG51bGwpKTtcbiAgfVxuXG4gIG1hcEFycmF5PFU+KG1hcHBlcjogKGl0ZW06IFNpbmdsZSkgPT4gVSk6IHJlYWRvbmx5IFVbXSB7XG4gICAgcmV0dXJuIHRoaXMucmVkdWNlKFxuICAgICAgKGFycmF5OiBVW10sIGl0ZW0pID0+IGFycmF5LnB1c2gobWFwcGVyKGl0ZW0pKSxcbiAgICAgIFtdLFxuICAgICAgXCJtdXRhdGVcIlxuICAgICk7XG4gIH1cbn1cblxuaW50ZXJmYWNlIFBhdGhEaWZmIHtcbiAgcmVhZG9ubHkgYWRkZWQ6IEFic29sdXRlUGF0aHM7XG4gIHJlYWRvbmx5IHJlbW92ZWQ6IEFic29sdXRlUGF0aHM7XG59XG5cbmludGVyZmFjZSBQYXRoRGlmZkJ5S2luZCB7XG4gIHJlYWRvbmx5IGZpbGVzOiBQYXRoRGlmZjtcbiAgcmVhZG9ubHkgZGlyZWN0b3JpZXM6IFBhdGhEaWZmO1xufVxuXG5jbGFzcyBBYnNvbHV0ZVBhdGhzXG4gIGV4dGVuZHMgTWFwcGFibGU8QWJzb2x1dGVQYXRoLCBBYnNvbHV0ZVBhdGhzPlxuICBpbXBsZW1lbnRzIEl0ZXJhYmxlPEFic29sdXRlUGF0aD5cbntcbiAgc3RhdGljIGVtcHR5KCk6IEFic29sdXRlUGF0aHMge1xuICAgIHJldHVybiBuZXcgQWJzb2x1dGVQYXRocyhuZXcgTWFwKCkpO1xuICB9XG5cbiAgc3RhdGljIGFzeW5jIGFsbChcbiAgICBpbnNpZGU6IEFic29sdXRlUGF0aCxcbiAgICBvcHRpb25zOiB7IGtpbmQ6IEZpbGVLaW5kIHwgXCJhbGxcIiB9ID0geyBraW5kOiBcInJlZ3VsYXJcIiB9XG4gICk6IFByb21pc2U8QWJzb2x1dGVQYXRocz4ge1xuICAgIHJldHVybiBBYnNvbHV0ZVBhdGhzLmdsb2IoXCIqKlwiLCBpbnNpZGUsIG9wdGlvbnMpO1xuICB9XG5cbiAgc3RhdGljIGFzeW5jIGdsb2IoXG4gICAgZ2xvYjogc3RyaW5nLFxuICAgIGluc2lkZTogQWJzb2x1dGVQYXRoLFxuICAgIHsga2luZCB9OiB7IGtpbmQ6IEZpbGVLaW5kIHwgXCJhbGxcIiB9ID0ge1xuICAgICAga2luZDogXCJyZWd1bGFyXCIsXG4gICAgfVxuICApIHtcbiAgICBsZXQgZnVsbEdsb2IgPSBwYXRoLnJlc29sdmUoQWJzb2x1dGVQYXRoLmdldEZpbGVuYW1lKGluc2lkZSksIGdsb2IpO1xuICAgIHJldHVybiBBYnNvbHV0ZVBhdGhzLiNnbG9iKGZ1bGxHbG9iLCBraW5kKTtcbiAgfVxuXG4gIHN0YXRpYyBhc3luYyAjZ2xvYihcbiAgICBnbG9iOiBzdHJpbmcsXG4gICAga2luZDogRmlsZUtpbmQgfCBcImFsbFwiXG4gICk6IFByb21pc2U8QWJzb2x1dGVQYXRocz4ge1xuICAgIHN3aXRjaCAoa2luZCkge1xuICAgICAgY2FzZSBcImRpcmVjdG9yeVwiOiB7XG4gICAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGhzLm1hcmtlZChcbiAgICAgICAgICBhd2FpdCBzZWFyY2hHbG9iKGdsb2IsIHtcbiAgICAgICAgICAgIG1hcmtEaXJlY3RvcmllczogdHJ1ZSxcbiAgICAgICAgICAgIG9ubHlEaXJlY3RvcmllczogdHJ1ZSxcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwicmVndWxhclwiOiB7XG4gICAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGhzLm1hcmtlZChcbiAgICAgICAgICBhd2FpdCBzZWFyY2hHbG9iKGdsb2IsIHtcbiAgICAgICAgICAgIG9ubHlGaWxlczogdHJ1ZSxcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICBjYXNlIFwiYWxsXCI6IHtcbiAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aHMubWFya2VkKFxuICAgICAgICAgIGF3YWl0IHNlYXJjaEdsb2IoZ2xvYiwge1xuICAgICAgICAgICAgb25seUZpbGVzOiBmYWxzZSxcbiAgICAgICAgICAgIG9ubHlEaXJlY3RvcmllczogZmFsc2UsXG4gICAgICAgICAgICBtYXJrRGlyZWN0b3JpZXM6IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBleGhhdXN0aXZlKGtpbmQsIFwia2luZFwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzdGF0aWMgZnJvbShwYXRoczogcmVhZG9ubHkgSW50b0Fic29sdXRlUGF0aFtdKTogQWJzb2x1dGVQYXRocyB7XG4gICAgbGV0IHNldCA9IEFic29sdXRlUGF0aHMuZW1wdHkoKTtcblxuICAgIGZvciAobGV0IHBhdGggb2YgcGF0aHMpIHtcbiAgICAgIHNldC5hZGQoQWJzb2x1dGVQYXRoLmZyb20ocGF0aCkpO1xuICAgIH1cblxuICAgIHJldHVybiBzZXQ7XG4gIH1cblxuICBzdGF0aWMgbWFya2VkKHBhdGhzOiBJdGVyYWJsZTxzdHJpbmc+KTogQWJzb2x1dGVQYXRocyB7XG4gICAgbGV0IHNldCA9IEFic29sdXRlUGF0aHMuZW1wdHkoKTtcbiAgICBzZXQuYWRkKFsuLi5wYXRoc10ubWFwKEFic29sdXRlUGF0aC5tYXJrZWQpKTtcbiAgICByZXR1cm4gc2V0O1xuICB9XG5cbiAgI3BhdGhzOiBNYXA8c3RyaW5nLCBBYnNvbHV0ZVBhdGg+O1xuXG4gIGNvbnN0cnVjdG9yKHBhdGhzOiBNYXA8c3RyaW5nLCBBYnNvbHV0ZVBhdGg+KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLiNwYXRocyA9IHBhdGhzO1xuICB9XG5cbiAgY2xvbmUoKTogQWJzb2x1dGVQYXRocyB7XG4gICAgcmV0dXJuIG5ldyBBYnNvbHV0ZVBhdGhzKG5ldyBNYXAodGhpcy4jcGF0aHMpKTtcbiAgfVxuXG4gIGdldCBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuI3BhdGhzLnNpemU7XG4gIH1cblxuICBnZXQgcmVndWxhckZpbGVzKCk6IEFic29sdXRlUGF0aHMge1xuICAgIHJldHVybiB0aGlzLm1hcCgocGF0aCkgPT4gKHBhdGguaXNSZWd1bGFyRmlsZSA/IHBhdGggOiBudWxsKSk7XG4gIH1cblxuICBnZXQgZGlyZWN0b3JpZXMoKTogQWJzb2x1dGVQYXRocyB7XG4gICAgcmV0dXJuIHRoaXMubWFwKChwYXRoKSA9PiAocGF0aC5pc0RpcmVjdG9yeSA/IHBhdGggOiBudWxsKSk7XG4gIH1cblxuICAvKipcbiAgICogTWFwIGVhY2ggcGF0aCBpbiB0aGlzIHNldDpcbiAgICpcbiAgICogLSBpZiBpdCdzIGEgZGlyZWN0b3J5LCBsZWF2ZSBpdCBhbG9uZVxuICAgKiAtIGlmIGl0J3MgYSByZWd1bGFyIGZpbGUsIGdldCB0aGUgZmlsZSdzIGRpcmVjdG9yeVxuICAgKi9cbiAgZ2V0IGRpcmVjdG9yeSgpOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoKHBhdGgpID0+IChwYXRoLmlzRGlyZWN0b3J5ID8gcGF0aCA6IHBhdGgucGFyZW50KSk7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIGFueSBvZiB0aGUgZmlsZXMgaW4gdGhpcyBzZXQgYXJlIGRpcmVjdG9yaWVzIHRoYXQgY29udGFpbiB0aGlzIHBhdGhcbiAgICovXG4gIGNvbnRhaW5zKG1heWJlQ2hpbGQ6IEFic29sdXRlUGF0aCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuZmluZCgocGF0aCkgPT4gcGF0aC5jb250YWlucyhtYXliZUNoaWxkKSk7XG4gIH1cblxuICBkaWZmKG90aGVyOiBBYnNvbHV0ZVBhdGhzKTogeyBhZGRlZDogQWJzb2x1dGVQYXRoczsgcmVtb3ZlZDogQWJzb2x1dGVQYXRocyB9IHtcbiAgICBsZXQgZGlmZnMgPSBkaWZmKFxuICAgICAgWy4uLnRoaXNdLFxuICAgICAgWy4uLm90aGVyXSxcbiAgICAgIChhLCBiKSA9PiBBYnNvbHV0ZVBhdGguZ2V0RmlsZW5hbWUoYSkgPT09IEFic29sdXRlUGF0aC5nZXRGaWxlbmFtZShiKVxuICAgICk7XG5cbiAgICBsZXQgYWRkZWQgPSBBYnNvbHV0ZVBhdGhzLmZyb20oZGlmZnMuYWRkZWQpO1xuICAgIGxldCByZW1vdmVkID0gQWJzb2x1dGVQYXRocy5mcm9tKGRpZmZzLnJlbW92ZWQpLmZpbHRlcihcbiAgICAgIChwYXRoKSA9PiAhYWRkZWQuaGFzKHBhdGgpXG4gICAgKTtcblxuICAgIHJldHVybiB7XG4gICAgICBhZGRlZCxcbiAgICAgIHJlbW92ZWQsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGlzIG1ldGhvZCBkaWZmcyBmaWxlcyBhbmQgZGlyZWN0b3JpZXMsIGJ1dCBleGNsdWRlcyBhbnkgcmVtb3ZlZCBmaWxlc1xuICAgKiB0aGF0IGFyZSBkZXNjZW5kZW50cyBvZiBhIHJlbW92ZWQgZGlyZWN0b3J5LlxuICAgKi9cbiAgZGlmZkJ5S2luZChvdGhlcjogQWJzb2x1dGVQYXRocyk6IFBhdGhEaWZmQnlLaW5kIHtcbiAgICBsZXQgZGlyZWN0b3JpZXMgPSB0aGlzLmRpcmVjdG9yaWVzLmRpZmYob3RoZXIuZGlyZWN0b3JpZXMpO1xuXG4gICAgbG9nXG4gICAgICAubmV3bGluZSgpXG4gICAgICAuaGVhZGluZyhcIkRpcmVjdG9yaWVzXCIpXG4gICAgICAubmV3bGluZSgpXG4gICAgICAuaW5zcGVjdC5sYWJlbGVkKFwiW0xIU11cIiwgdGhpcy5kaXJlY3RvcmllcylcbiAgICAgIC5uZXdsaW5lKClcbiAgICAgIC5pbnNwZWN0LmxhYmVsZWQoXCJbUkhTXVwiLCBvdGhlci5kaXJlY3RvcmllcylcbiAgICAgIC5uZXdsaW5lKClcbiAgICAgIC5pbnNwZWN0LmxhYmVsZWQoXCJbRElGRl1cIiwgZGlyZWN0b3JpZXMpO1xuXG4gICAgbGV0IGNvbGxhcHNlZERpcmVjdG9yaWVzID0gZGlyZWN0b3JpZXMucmVtb3ZlZC5jb2xsYXBzZWREaXJlY3RvcmllcygpO1xuXG4gICAgbG9nLnNpbGVudC5uZXdsaW5lKCkuaW5zcGVjdC5sYWJlbGVkKFwiW0NMUFNdXCIsIGNvbGxhcHNlZERpcmVjdG9yaWVzKTtcblxuICAgIGxldCBmaWxlcyA9IHRoaXMucmVndWxhckZpbGVzLmRpZmYob3RoZXIucmVndWxhckZpbGVzKTtcblxuICAgIHJldHVybiB7XG4gICAgICBmaWxlczoge1xuICAgICAgICBhZGRlZDogZmlsZXMuYWRkZWQsXG4gICAgICAgIHJlbW92ZWQ6IGZpbGVzLnJlbW92ZWQucmVtb3ZlRGVzY2VuZGVudHNPZihjb2xsYXBzZWREaXJlY3RvcmllcyksXG4gICAgICB9LFxuICAgICAgZGlyZWN0b3JpZXM6IHtcbiAgICAgICAgYWRkZWQ6IGRpcmVjdG9yaWVzLmFkZGVkLFxuICAgICAgICByZW1vdmVkOiBjb2xsYXBzZWREaXJlY3RvcmllcyxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb2xsYXBzZSBhbnkgY2hpbGQgZGlyZWN0b3JpZXMgaW50byB0aGVpciBwYXJlbnRzLlxuICAgKi9cbiAgY29sbGFwc2VkRGlyZWN0b3JpZXMoKTogQWJzb2x1dGVQYXRocyB7XG4gICAgbGV0IGNvbGxhcHNlZCA9IEFic29sdXRlUGF0aHMuZW1wdHkoKTtcblxuICAgIGZvciAobGV0IHsgcGF0aCwgcmVzdCB9IG9mIHRoaXMuI2RyYWluKCkpIHtcbiAgICAgIGNvbnNvbGUubG9nKHsgcGF0aCwgcmVzdCB9KTtcbiAgICAgIGlmIChwYXRoLmlzUmVndWxhckZpbGUgfHwgIXJlc3QuY29udGFpbnMocGF0aCkpIHtcbiAgICAgICAgY29sbGFwc2VkLmFkZChwYXRoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLiNwYXRocyA9IGNvbGxhcHNlZC4jcGF0aHM7XG4gICAgcmV0dXJuIGNvbGxhcHNlZDtcbiAgfVxuXG4gIHJlbW92ZURlc2NlbmRlbnRzT2YoYW5jZXN0b3JzOiBBYnNvbHV0ZVBhdGhzKTogQWJzb2x1dGVQYXRocyB7XG4gICAgcmV0dXJuIHRoaXMubWFwKChwYXRoKSA9PiAoYW5jZXN0b3JzLmNvbnRhaW5zKHBhdGgpID8gbnVsbCA6IHBhdGgpKTtcbiAgfVxuXG4gIG1lcmdlKFxuICAgIHBhdGhzOiBBYnNvbHV0ZVBhdGggfCBBYnNvbHV0ZVBhdGhzIHwgcmVhZG9ubHkgQWJzb2x1dGVQYXRoW11cbiAgKTogQWJzb2x1dGVQYXRocyB7XG4gICAgbGV0IGNsb25lZCA9IHRoaXMuY2xvbmUoKTtcbiAgICBjbG9uZWQuYWRkKHBhdGhzKTtcbiAgICByZXR1cm4gY2xvbmVkO1xuICB9XG5cbiAgYWRkKHBhdGhzOiBBYnNvbHV0ZVBhdGggfCBBYnNvbHV0ZVBhdGhzIHwgcmVhZG9ubHkgQWJzb2x1dGVQYXRoW10pOiB2b2lkIHtcbiAgICBpZiAoaXNBcnJheShwYXRocykpIHtcbiAgICAgIGZvciAobGV0IHBhdGggb2YgcGF0aHMpIHtcbiAgICAgICAgdGhpcy4jYWRkKHBhdGgpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocGF0aHMgaW5zdGFuY2VvZiBBYnNvbHV0ZVBhdGhzKSB7XG4gICAgICBmb3IgKGxldCBwYXRoIG9mIHBhdGhzKSB7XG4gICAgICAgIHRoaXMuI2FkZChwYXRoKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy4jYWRkKHBhdGhzKTtcbiAgICB9XG4gIH1cblxuICAjYWRkKC4uLnBhdGhzOiByZWFkb25seSBBYnNvbHV0ZVBhdGhbXSk6IHZvaWQge1xuICAgIGZvciAobGV0IHBhdGggb2YgcGF0aHMpIHtcbiAgICAgIGxldCBmaWxlbmFtZSA9IEFic29sdXRlUGF0aC5nZXRGaWxlbmFtZShwYXRoKTtcblxuICAgICAgaWYgKCF0aGlzLiNwYXRocy5oYXMoZmlsZW5hbWUpKSB7XG4gICAgICAgIHRoaXMuI3BhdGhzLnNldChmaWxlbmFtZSwgcGF0aCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVtb3ZlKHBhdGhzOiBBYnNvbHV0ZVBhdGhzIHwgQWJzb2x1dGVQYXRoKSB7XG4gICAgbGV0IHRoaXNQYXRocyA9IHRoaXMuI3BhdGhzO1xuXG4gICAgaWYgKHBhdGhzIGluc3RhbmNlb2YgQWJzb2x1dGVQYXRoKSB7XG4gICAgICBsZXQgZmlsZW5hbWUgPSBBYnNvbHV0ZVBhdGguZ2V0RmlsZW5hbWUocGF0aHMpO1xuICAgICAgdGhpc1BhdGhzLmRlbGV0ZShmaWxlbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAobGV0IGZpbGVuYW1lIG9mIHBhdGhzLiNwYXRocy5rZXlzKCkpIHtcbiAgICAgICAgdGhpc1BhdGhzLmRlbGV0ZShmaWxlbmFtZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaGFzKHBhdGg6IEFic29sdXRlUGF0aCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiNwYXRocy5oYXMoQWJzb2x1dGVQYXRoLmdldEZpbGVuYW1lKHBhdGgpKTtcbiAgfVxuXG4gIHJlZHVjZTxVPihcbiAgICBtYXBwZXI6IChidWlsZDogVSwgcGF0aDogQWJzb2x1dGVQYXRoKSA9PiB2b2lkLFxuICAgIGJ1aWxkOiBVLFxuICAgIHN0cmF0ZWd5OiBcIm11dGF0ZVwiXG4gICk6IFU7XG4gIHJlZHVjZTxVPihcbiAgICBtYXBwZXI6IChhY2N1bXVsYXRvcjogVSwgcGF0aDogQWJzb2x1dGVQYXRoKSA9PiB2b2lkLFxuICAgIGluaXRpYWw6IFUsXG4gICAgc3RyYXRlZ3k/OiBcImZ1bmN0aW9uYWxcIlxuICApOiBVO1xuICByZWR1Y2U8VT4oXG4gICAgbWFwcGVyOiAoYnVpbGQ6IFUsIHBhdGg6IEFic29sdXRlUGF0aCkgPT4gVSB8IHZvaWQsXG4gICAgaW5pdGlhbDogVSxcbiAgICBzdHJhdGVneTogXCJmdW5jdGlvbmFsXCIgfCBcIm11dGF0ZVwiID0gXCJmdW5jdGlvbmFsXCJcbiAgKTogVSB7XG4gICAgaWYgKHN0cmF0ZWd5ID09PSBcIm11dGF0ZVwiKSB7XG4gICAgICBmb3IgKGxldCBwYXRoIG9mIHRoaXMpIHtcbiAgICAgICAgbWFwcGVyKGluaXRpYWwsIHBhdGgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaW5pdGlhbDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IGFjY3VtdWxhdG9yID0gaW5pdGlhbDtcblxuICAgICAgZm9yIChsZXQgcGF0aCBvZiB0aGlzKSB7XG4gICAgICAgIGFjY3VtdWxhdG9yID0gbWFwcGVyKGFjY3VtdWxhdG9yLCBwYXRoKSBhcyBVO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYWNjdW11bGF0b3I7XG4gICAgfVxuICB9XG5cbiAgbWFwKG1hcHBlcjogKHBhdGg6IEFic29sdXRlUGF0aCkgPT4gQWJzb2x1dGVQYXRoIHwgbnVsbCk6IEFic29sdXRlUGF0aHMge1xuICAgIGxldCBwYXRocyA9IEFic29sdXRlUGF0aHMuZW1wdHkoKTtcblxuICAgIGZvciAobGV0IHBhdGggb2YgdGhpcy4jcGF0aHMudmFsdWVzKCkpIHtcbiAgICAgIGxldCBtYXBwZWRQYXRoID0gbWFwcGVyKHBhdGgpO1xuXG4gICAgICBpZiAobWFwcGVkUGF0aCkge1xuICAgICAgICBwYXRocy5hZGQobWFwcGVkUGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhdGhzO1xuICB9XG5cbiAgZmxhdE1hcChcbiAgICBtYXBwZXI6IChcbiAgICAgIHBhdGg6IEFic29sdXRlUGF0aFxuICAgICkgPT4gcmVhZG9ubHkgQWJzb2x1dGVQYXRoW10gfCBBYnNvbHV0ZVBhdGhzIHwgQWJzb2x1dGVQYXRoXG4gICk6IEFic29sdXRlUGF0aHMge1xuICAgIGxldCBwYXRocyA9IEFic29sdXRlUGF0aHMuZW1wdHkoKTtcblxuICAgIGZvciAobGV0IHBhdGggb2YgdGhpcy4jcGF0aHMudmFsdWVzKCkpIHtcbiAgICAgIHBhdGhzLmFkZChtYXBwZXIocGF0aCkpO1xuICAgIH1cblxuICAgIHJldHVybiBwYXRocztcbiAgfVxuXG4gIGZpbmQoZmluZGVyOiAocGF0aDogQWJzb2x1dGVQYXRoKSA9PiBib29sZWFuKTogQWJzb2x1dGVQYXRoIHwgdm9pZCB7XG4gICAgZm9yIChsZXQgcGF0aCBvZiB0aGlzLiNwYXRocy52YWx1ZXMoKSkge1xuICAgICAgbGV0IGZvdW5kID0gZmluZGVyKHBhdGgpO1xuXG4gICAgICBpZiAoZm91bmQpIHtcbiAgICAgICAgcmV0dXJuIHBhdGg7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZ2V0ICNzb3J0ZWQoKTogTWFwPHN0cmluZywgQWJzb2x1dGVQYXRoPiB7XG4gICAgbGV0IGVudHJpZXMgPSBbLi4udGhpcy4jcGF0aHMuZW50cmllcygpXS5zb3J0KFxuICAgICAgKFthXSwgW2JdKSA9PiBiLmxlbmd0aCAtIGEubGVuZ3RoXG4gICAgKTtcbiAgICByZXR1cm4gbmV3IE1hcChlbnRyaWVzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlIHRoZSBwYXRocyBpbiB0aGlzIHNldC4gTGFyZ2VyIHBhdGhzIGNvbWUgZmlyc3QuXG4gICAqL1xuICAqI2RyYWluKCk6IEl0ZXJhYmxlSXRlcmF0b3I8eyBwYXRoOiBBYnNvbHV0ZVBhdGg7IHJlc3Q6IEFic29sdXRlUGF0aHMgfT4ge1xuICAgIGxldCByZXN0ID0gdGhpcy4jc29ydGVkLmVudHJpZXMoKTtcbiAgICBsZXQgbmV4dCA9IHJlc3QubmV4dCgpO1xuXG4gICAgd2hpbGUgKCFuZXh0LmRvbmUpIHtcbiAgICAgIGxldCBbLCBwYXRoXSA9IG5leHQudmFsdWU7XG4gICAgICBsZXQgcmVzdFBhdGhzID0gbmV3IEFic29sdXRlUGF0aHMobmV3IE1hcChyZXN0KSk7XG5cbiAgICAgIHlpZWxkIHsgcGF0aCwgcmVzdDogcmVzdFBhdGhzIH07XG5cbiAgICAgIHJlc3QgPSByZXN0UGF0aHMuI3BhdGhzLmVudHJpZXMoKTtcbiAgICAgIG5leHQgPSByZXN0Lm5leHQoKTtcbiAgICB9XG4gIH1cblxuICAqW1N5bWJvbC5pdGVyYXRvcl0oKSB7XG4gICAgZm9yIChsZXQgcGF0aCBvZiB0aGlzLiNzb3J0ZWQudmFsdWVzKCkpIHtcbiAgICAgIHlpZWxkIHBhdGg7XG4gICAgfVxuICB9XG5cbiAgW0lOU1BFQ1RdKCkge1xuICAgIHJldHVybiBbLi4udGhpc107XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNBcnJheTxUIGV4dGVuZHMgdW5rbm93bltdIHwgcmVhZG9ubHkgdW5rbm93bltdPihcbiAgdmFsdWU6IHVua25vd24gfCBUXG4pOiB2YWx1ZSBpcyBUIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBpc1Jvb3QocDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBwYXRoLnBhcnNlKHApLnJvb3QgPT09IHA7XG59XG5cbnR5cGUgRmlsZUtpbmQgPSBcInJlZ3VsYXJcIiB8IFwiZGlyZWN0b3J5XCI7XG50eXBlIFNlYXJjaEtpbmQgPSBGaWxlS2luZCB8IFwiYWxsXCI7XG50eXBlIEFic29sdXRlUGF0aEtpbmQgPSBGaWxlS2luZCB8IFwicm9vdFwiO1xudHlwZSBJbnRvQWJzb2x1dGVQYXRoID1cbiAgfCBBYnNvbHV0ZVBhdGhcbiAgfCBGaWxlUGFydHNcbiAgfCBba2luZDogQWJzb2x1dGVQYXRoS2luZCB8IFwibWFya2VkXCIsIGZpbGVuYW1lOiBzdHJpbmddO1xuXG5pbnRlcmZhY2UgU2VhcmNoIHtcbiAga2luZDogU2VhcmNoS2luZDtcbn1cblxuY2xhc3MgQWJzb2x1dGVQYXRoIHtcbiAgc3RhdGljIGZpbGUocGF0aDogc3RyaW5nKTogQWJzb2x1dGVQYXRoIHtcbiAgICByZXR1cm4gQWJzb2x1dGVQYXRoLiNjaGVja2VkKHBhdGgsIFwicmVndWxhclwiLCBcIi5maWxlXCIpO1xuICB9XG5cbiAgc3RhdGljIGZyb20oaW50b1BhdGg6IEludG9BYnNvbHV0ZVBhdGgpOiBBYnNvbHV0ZVBhdGgge1xuICAgIGlmIChpc0FycmF5KGludG9QYXRoKSkge1xuICAgICAgbGV0IFtraW5kLCBmaWxlbmFtZV0gPSBpbnRvUGF0aDtcblxuICAgICAgc3dpdGNoIChraW5kKSB7XG4gICAgICAgIGNhc2UgXCJyb290XCI6XG4gICAgICAgIGNhc2UgXCJkaXJlY3RvcnlcIjpcbiAgICAgICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLmRpcmVjdG9yeShmaWxlbmFtZSk7XG4gICAgICAgIGNhc2UgXCJtYXJrZWRcIjpcbiAgICAgICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLm1hcmtlZChmaWxlbmFtZSk7XG4gICAgICAgIGNhc2UgXCJyZWd1bGFyXCI6XG4gICAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC5maWxlKGZpbGVuYW1lKTtcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIGV4aGF1c3RpdmUoa2luZCwgXCJraW5kXCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaW50b1BhdGggaW5zdGFuY2VvZiBBYnNvbHV0ZVBhdGgpIHtcbiAgICAgIHJldHVybiBpbnRvUGF0aDtcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IHtcbiAgICAgICAgcGFyZW50LFxuICAgICAgICBiYXNlbmFtZTogeyBmaWxlLCBleHQgfSxcbiAgICAgICAga2luZCxcbiAgICAgIH0gPSBpbnRvUGF0aDtcblxuICAgICAgaWYgKHBhcmVudCkge1xuICAgICAgICBpZiAoZXh0KSB7XG4gICAgICAgICAgbGV0IGZpbGVuYW1lID0gcGF0aC5yZXNvbHZlKHBhcmVudCwgYCR7ZmlsZX0uJHtleHR9YCk7XG4gICAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChmaWxlbmFtZSwga2luZCA/PyBcInJlZ3VsYXJcIiwgXCIuZnJvbVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXQgZmlsZW5hbWUgPSBwYXRoLnJlc29sdmUocGFyZW50LCBmaWxlKTtcbiAgICAgICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLiNjaGVja2VkKGZpbGVuYW1lLCBraW5kID8/IFwicmVndWxhclwiLCBcIi5mcm9tXCIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBubyBwYXJlbnQgbWVhbnMgdGhlIGZpbGUgcmVwcmVzZW50cyB0aGUgcm9vdFxuICAgICAgICBpZiAodHlwZW9mIGtpbmQgPT09IFwic3RyaW5nXCIgJiYga2luZCAhPT0gXCJyb290XCIpIHtcbiAgICAgICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgICAgIGBCVUc6IGdldFBhcnRzKCkgcHJvZHVjZWQgeyBwYXJlbnQ6IG51bGwsIGtpbmQ6IG5vdCAncm9vdCcgfSAoaW52YXJpYW50IGNoZWNrKWBcbiAgICAgICAgICApO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChmaWxlLCBcInJvb3RcIiwgXCIuZnJvbVwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzdGF0aWMgZGlyZWN0b3J5KGRpcmVjdG9yeTogc3RyaW5nKTogQWJzb2x1dGVQYXRoIHtcbiAgICBpZiAoaXNSb290KGRpcmVjdG9yeSkpIHtcbiAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguI2NoZWNrZWQoZGlyZWN0b3J5LCBcInJvb3RcIiwgXCIuZGlyZWN0b3J5XCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLiNjaGVja2VkKGRpcmVjdG9yeSwgXCJkaXJlY3RvcnlcIiwgXCIuZGlyZWN0b3J5XCIpO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBtYXJrZWQocGF0aDogc3RyaW5nKTogQWJzb2x1dGVQYXRoIHtcbiAgICBpZiAoaXNSb290KHBhdGgpKSB7XG4gICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLiNjaGVja2VkKHBhdGgsIFwicm9vdFwiLCBcIi5tYXJrZWRcIik7XG4gICAgfSBlbHNlIGlmIChwYXRoLmVuZHNXaXRoKFwiL1wiKSkge1xuICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChwYXRoLCBcImRpcmVjdG9yeVwiLCBcIi5tYXJrZWRcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguI2NoZWNrZWQocGF0aCwgXCJyZWd1bGFyXCIsIFwiLm1hcmtlZFwiKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgI2NoZWNrZWQoXG4gICAgZmlsZW5hbWU6IHN0cmluZyxcbiAgICBraW5kOiBcInJvb3RcIiB8IFwiZGlyZWN0b3J5XCIgfCBcInJlZ3VsYXJcIixcbiAgICBmcm9tU3RhdGljTWV0aG9kOiBzdHJpbmdcbiAgKTogQWJzb2x1dGVQYXRoIHtcbiAgICBpZiAoaXNBYnNvbHV0ZShmaWxlbmFtZSkpIHtcbiAgICAgIHJldHVybiBuZXcgQWJzb2x1dGVQYXRoKGtpbmQsIGZpbGVuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIGBVbmV4cGVjdGVkIHJlbGF0aXZlIHBhdGggcGFzc2VkIHRvIEFic29sdXRlUGF0aCR7ZnJvbVN0YXRpY01ldGhvZH0gKCR7cGF0aH0pYFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgZ2V0RmlsZW5hbWUocGF0aDogQWJzb2x1dGVQYXRoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcGF0aC4jZmlsZW5hbWU7XG4gIH1cblxuICAvLyBBIGRpcmVjdG9yeSBlbmRzIHdpdGggYC9gLCB3aGlsZSBhIGZpbGUgZG9lcyBub3RcbiAgcmVhZG9ubHkgI2tpbmQ6IFwicmVndWxhclwiIHwgXCJkaXJlY3RvcnlcIiB8IFwicm9vdFwiO1xuICByZWFkb25seSAjZmlsZW5hbWU6IHN0cmluZztcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgIGtpbmQ6IFwicmVndWxhclwiIHwgXCJkaXJlY3RvcnlcIiB8IFwicm9vdFwiLFxuICAgIGZpbGVuYW1lOiBzdHJpbmdcbiAgKSB7XG4gICAgdGhpcy4ja2luZCA9IGtpbmQ7XG4gICAgdGhpcy4jZmlsZW5hbWUgPSBmaWxlbmFtZTtcbiAgfVxuXG4gIGdldCBpc1Jvb3QoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuI2tpbmQgPT09IFwicm9vdFwiO1xuICB9XG5cbiAgZ2V0IGlzRGlyZWN0b3J5KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiNraW5kID09PSBcImRpcmVjdG9yeVwiIHx8IHRoaXMuI2tpbmQgPT09IFwicm9vdFwiO1xuICB9XG5cbiAgZ2V0IGlzUmVndWxhckZpbGUoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuI2tpbmQgPT09IFwicmVndWxhclwiO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcGFyZW50IGRpcmVjdG9yeSBvZiB0aGlzIEFic29sdXRlUGF0aC4gSWYgdGhpcyBwYXRoIHJlcHJlc2VudHMgYVxuICAgKiBmaWxlIHN5c3RlbSByb290LCBgcGFyZW50YCByZXR1cm5zIG51bGwuXG4gICAqL1xuICBnZXQgcGFyZW50KCk6IEFic29sdXRlUGF0aCB8IG51bGwge1xuICAgIC8vIEF2b2lkIGluZmluaXRlIHJlY3Vyc2lvbiBhdCB0aGUgcm9vdCAoYC9gIG9yIGBDOlxcYCwgZXRjLilcbiAgICBpZiAodGhpcy5pc1Jvb3QpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLmRpcmVjdG9yeShwYXRoLmRpcm5hbWUodGhpcy4jZmlsZW5hbWUpKTtcbiAgICB9XG4gIH1cblxuICBnZXQgYmFzZW5hbWUoKTogeyBmaWxlOiBzdHJpbmc7IGV4dDogc3RyaW5nIHwgbnVsbCB9IHtcbiAgICByZXR1cm4gZ2V0UGFydHModGhpcy4jZmlsZW5hbWUpLmJhc2VuYW1lO1xuICB9XG5cbiAgZ2V0IGV4dGVuc2lvbigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5iYXNlbmFtZS5leHQ7XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBzcGVjaWZpZWQgZXh0ZW5zaW9uIGlzIGF0IHRoZSBlbmQgb2YgdGhlIGZpbGVuYW1lLiBUaGlzXG4gICAqIG1lYW5zIHRoYXQgYGluZGV4LmQudHNgIGhhcyB0aGUgZXh0ZW5zaW9uIGBkLnRzYCAqYW5kKiBgdHNgLlxuICAgKlxuICAgKiBTZWUgaGFzRXhhY3RFeHRlbnNpb24gaWYgeW91IHdhbnQgYGQudHNgIHRvIG1hdGNoLCBidXQgbm90IGB0c2BcbiAgICovXG4gIGhhc0V4dGVuc2lvbjxTIGV4dGVuZHMgYC4ke3N0cmluZ31gPihcbiAgICBleHRlbnNpb246IFNcbiAgKTogYFRoZSBleHRlbnNpb24gcGFzc2VkIHRvIGhhc0V4dGVuc2lvbiBzaG91bGQgbm90IGhhdmUgYSBsZWFkaW5nICcuJ2A7XG4gIGhhc0V4dGVuc2lvbihleHRlbnNpb246IHN0cmluZyk6IGJvb2xlYW47XG4gIGhhc0V4dGVuc2lvbihleHRlbnNpb246IHN0cmluZyk6IHVua25vd24ge1xuICAgIGlmIChleHRlbnNpb24uc3RhcnRzV2l0aChcIi5cIikpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBgVGhlIGV4dGVuc2lvbiBwYXNzZWQgdG8gaGFzRXh0ZW5zaW9uIHNob3VsZCBub3QgaGF2ZSBhIGxlYWRpbmcgJy4nYFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBsZXQge1xuICAgICAgYmFzZW5hbWU6IHsgZXh0IH0sXG4gICAgfSA9IGdldFBhcnRzKHRoaXMuI2ZpbGVuYW1lKTtcblxuICAgIHJldHVybiBleHQgPT09IGV4dGVuc2lvbjtcbiAgfVxuXG4gIGNoYW5nZUV4dGVuc2lvbjxTIGV4dGVuZHMgYC4ke3N0cmluZ31gPihcbiAgICBleHRlbnNpb246IFNcbiAgKTogYFRoZSBleHRlbnNpb24gcGFzc2VkIHRvIGhhc0V4dGVuc2lvbiBzaG91bGQgbm90IGhhdmUgYSBsZWFkaW5nICcuJ2A7XG4gIGNoYW5nZUV4dGVuc2lvbihleHRlbnNpb246IHN0cmluZyk6IEFic29sdXRlUGF0aDtcbiAgY2hhbmdlRXh0ZW5zaW9uKGV4dGVuc2lvbjogc3RyaW5nKTogdW5rbm93biB7XG4gICAgbGV0IHtcbiAgICAgIHBhcmVudCxcbiAgICAgIGJhc2VuYW1lOiB7IGZpbGUgfSxcbiAgICB9ID0gZ2V0UGFydHModGhpcy4jZmlsZW5hbWUpO1xuXG4gICAgbGV0IHJlbmFtZWQgPSBgJHtmaWxlfS4ke2V4dGVuc2lvbn1gO1xuXG4gICAgaWYgKHBhcmVudCkge1xuICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC5maWxlKHBhdGgucmVzb2x2ZShwYXJlbnQsIHJlbmFtZWQpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC5maWxlKHJlbmFtZWQpO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgdGhlIGZpbGUgbWF0Y2hlcyB0aGUgZXhhY3QgZXh0ZW5zaW9uLiBUaGlzIG1lYW5zIHRoYXRcbiAgICogYGluZGV4LmQudHNgIGhhcyB0aGUgZXhhY3QgZXh0ZW5zaW9uIGBkLnRzYCBidXQgKm5vdCogYHRzYC5cbiAgICovXG4gIGhhc0V4YWN0RXh0ZW5zaW9uPFMgZXh0ZW5kcyBgLiR7c3RyaW5nfWA+KFxuICAgIGV4dGVuc2lvbjogU1xuICApOiBgVGhlIGV4dGVuc2lvbiBwYXNzZWQgdG8gaGFzRXh0ZW5zaW9uIHNob3VsZCBub3QgaGF2ZSBhIGxlYWRpbmcgJy4nYDtcbiAgaGFzRXhhY3RFeHRlbnNpb24oZXh0ZW5zaW9uOiBzdHJpbmcpOiBib29sZWFuO1xuICBoYXNFeGFjdEV4dGVuc2lvbihleHRlbnNpb246IHN0cmluZyk6IHVua25vd24ge1xuICAgIGlmIChleHRlbnNpb24uc3RhcnRzV2l0aChcIi5cIikpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBgVGhlIGV4dGVuc2lvbiBwYXNzZWQgdG8gaGFzRXh0ZW5zaW9uIHNob3VsZCBub3QgaGF2ZSBhIGxlYWRpbmcgJy4nYFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBsZXQge1xuICAgICAgYmFzZW5hbWU6IHsgZXh0IH0sXG4gICAgfSA9IGdldFBhcnRzKHRoaXMuI2ZpbGVuYW1lKTtcblxuICAgIHJldHVybiBleHQgPT09IGV4dGVuc2lvbjtcbiAgfVxuXG4gIGFzeW5jIGdsb2Ioc2VhcmNoOiBTZWFyY2gpOiBQcm9taXNlPEFic29sdXRlUGF0aHM+O1xuICBhc3luYyBnbG9iKGdsb2I6IHN0cmluZywgc2VhcmNoPzogU2VhcmNoKTogUHJvbWlzZTxBYnNvbHV0ZVBhdGhzPjtcbiAgYXN5bmMgZ2xvYigpOiBQcm9taXNlPEFic29sdXRlUGF0aHM+O1xuICBhc3luYyBnbG9iKFxuICAgIC4uLmFyZ3M6IFtzZWFyY2g6IFNlYXJjaF0gfCBbZ2xvYjogc3RyaW5nLCBzZWFyY2g/OiBTZWFyY2hdIHwgW11cbiAgKTogUHJvbWlzZTxBYnNvbHV0ZVBhdGhzPiB7XG4gICAgbGV0IGdsb2I6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBsZXQgc2VhcmNoOiBTZWFyY2ggfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG5cbiAgICBpZiAoYXJncy5sZW5ndGggIT09IDApIHtcbiAgICAgIGlmICh0eXBlb2YgYXJnc1swXSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICBbZ2xvYiwgc2VhcmNoXSA9IGFyZ3M7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBbc2VhcmNoXSA9IGFyZ3M7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuI2tpbmQgPT09IFwicmVndWxhclwiKSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgYFlvdSBjYW5ub3QgZXhlY3V0ZSBhIGdsb2IgaW5zaWRlIGEgcmVndWxhciBmaWxlIChmaWxlPSR7XG4gICAgICAgICAgdGhpcy4jZmlsZW5hbWVcbiAgICAgICAgfSwgZ2xvYj0ke2dsb2J9LCBzZWFyY2g9JHtzZWFyY2g/LmtpbmQgPz8gXCJyZWd1bGFyXCJ9KWBcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIEFic29sdXRlUGF0aHMuZ2xvYihnbG9iID8/IFwiKipcIiwgdGhpcywgc2VhcmNoKTtcbiAgfVxuXG4gIGZpbGUoLi4ucmVsYXRpdmVQYXRoOiByZWFkb25seSBzdHJpbmdbXSk6IEFic29sdXRlUGF0aCB7XG4gICAgaWYgKHRoaXMuI2tpbmQgPT09IFwicmVndWxhclwiKSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgYENhbm5vdCBjcmVhdGUgYSBuZXN0ZWQgZmlsZSBpbnNpZGUgYSByZWd1bGFyIGZpbGUgKHBhcmVudD0ke1xuICAgICAgICAgIHRoaXMuI2ZpbGVuYW1lXG4gICAgICAgIH0sIGNoaWxkPSR7cGF0aC5qb2luKC4uLnJlbGF0aXZlUGF0aCl9KWBcbiAgICAgICk7XG4gICAgfVxuXG4gICAgbG9nLnNpbGVudC5pbnNwZWN0LmxhYmVsZWQoYFtGSUxFXWAsIHtcbiAgICAgIHJlc29sdmVkOiBwYXRoLnJlc29sdmUodGhpcy4jZmlsZW5hbWUsIC4uLnJlbGF0aXZlUGF0aCksXG4gICAgICBwYXRoOiBBYnNvbHV0ZVBhdGguZmlsZShwYXRoLnJlc29sdmUodGhpcy4jZmlsZW5hbWUsIC4uLnJlbGF0aXZlUGF0aCkpLFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIEFic29sdXRlUGF0aC5maWxlKHBhdGgucmVzb2x2ZSh0aGlzLiNmaWxlbmFtZSwgLi4ucmVsYXRpdmVQYXRoKSk7XG4gIH1cblxuICBkaXJlY3RvcnkoLi4ucmVsYXRpdmVQYXRoOiByZWFkb25seSBzdHJpbmdbXSk6IEFic29sdXRlUGF0aCB7XG4gICAgaWYgKHRoaXMuI2tpbmQgPT09IFwicmVndWxhclwiKSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgYENhbm5vdCBjcmVhdGUgYSBuZXN0ZWQgZGlyZWN0b3J5IGluc2lkZSBhIHJlZ3VsYXIgZmlsZSAocGFyZW50PSR7XG4gICAgICAgICAgdGhpcy4jZmlsZW5hbWVcbiAgICAgICAgfSwgY2hpbGQ9JHtwYXRoLmpvaW4oLi4ucmVsYXRpdmVQYXRoKX0pYFxuICAgICAgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gQWJzb2x1dGVQYXRoLmRpcmVjdG9yeShcbiAgICAgIHBhdGgucmVzb2x2ZSh0aGlzLiNmaWxlbmFtZSwgLi4ucmVsYXRpdmVQYXRoKVxuICAgICk7XG4gIH1cblxuICByZWxhdGl2ZUZyb21BbmNlc3RvcihhbmNlc3RvcjogQWJzb2x1dGVQYXRoKSB7XG4gICAgaWYgKCFhbmNlc3Rvci5jb250YWlucyh0aGlzKSkge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIGBDYW5ub3QgY29tcHV0ZSBhIHJlbGF0aXZlIHBhdGggZnJvbSAke2FuY2VzdG9yLiNmaWxlbmFtZX0gdG8gJHtcbiAgICAgICAgICB0aGlzLiNmaWxlbmFtZVxuICAgICAgICB9LCBiZWNhdXNlIGl0IGlzIG5vdCBhbiBhbmNlc3RvcmBcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHBhdGgucmVsYXRpdmUoYW5jZXN0b3IuI2ZpbGVuYW1lLCB0aGlzLiNmaWxlbmFtZSk7XG4gIH1cblxuICBjb250YWlucyhtYXliZUNoaWxkOiBBYnNvbHV0ZVBhdGgpOiBib29sZWFuIHtcbiAgICBsZXQgcmVsYXRpdmUgPSBwYXRoLnJlbGF0aXZlKHRoaXMuI2ZpbGVuYW1lLCBtYXliZUNoaWxkLiNmaWxlbmFtZSk7XG5cbiAgICByZXR1cm4gIXJlbGF0aXZlLnN0YXJ0c1dpdGgoXCIuXCIpO1xuICB9XG5cbiAgZXEob3RoZXI6IEFic29sdXRlUGF0aCkge1xuICAgIHJldHVybiB0aGlzLiNmaWxlbmFtZSA9PT0gb3RoZXIuI2ZpbGVuYW1lO1xuICB9XG5cbiAgW0lOU1BFQ1RdKGNvbnRleHQ6IG51bGwsIHsgc3R5bGl6ZSB9OiB1dGlsLkluc3BlY3RPcHRpb25zU3R5bGl6ZWQpIHtcbiAgICByZXR1cm4gYCR7c3R5bGl6ZShcIlBhdGhcIiwgXCJzcGVjaWFsXCIpfSgke3N0eWxpemUoXG4gICAgICB0aGlzLiNmaWxlbmFtZSxcbiAgICAgIFwibW9kdWxlXCJcbiAgICApfSlgO1xuICB9XG59XG5cbmNsYXNzIFByZXBhcmVUcmFuc3BpbGF0aW9uIHtcbiAgc3RhdGljIGNyZWF0ZShuYW1lOiBzdHJpbmcsIGRpZmY6IFBhdGhEaWZmQnlLaW5kKTogUHJlcGFyZVRyYW5zcGlsYXRpb24ge1xuICAgIHJldHVybiBuZXcgUHJlcGFyZVRyYW5zcGlsYXRpb24obmFtZSwgZGlmZik7XG4gIH1cblxuICByZWFkb25seSAjbmFtZTogc3RyaW5nO1xuICByZWFkb25seSAjZGlmZjogUGF0aERpZmZCeUtpbmQ7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIGRpZmY6IFBhdGhEaWZmQnlLaW5kKSB7XG4gICAgdGhpcy4jbmFtZSA9IG5hbWU7XG4gICAgdGhpcy4jZGlmZiA9IGRpZmY7XG4gIH1cblxuICBhc3luYyBydW4oeyBkcnlSdW4gfTogeyBkcnlSdW46IGJvb2xlYW4gfSA9IHsgZHJ5UnVuOiBmYWxzZSB9KSB7XG4gICAgbGV0IHsgZGlyZWN0b3JpZXMsIGZpbGVzIH0gPSB0aGlzLiNkaWZmO1xuXG4gICAgaWYgKGRyeVJ1bikge1xuICAgICAgbG9nXG4gICAgICAgIC5uZXdsaW5lKClcbiAgICAgICAgLmxvZyhcIltEUlktUlVOXVwiLCB0aGlzLiNuYW1lKVxuICAgICAgICAubmV3bGluZSgpXG4gICAgICAgIC5oZWFkaW5nKFwiW0RSWS1SVU5dXCIsIFwiRGlyZWN0b3JpZXNcIik7XG5cbiAgICAgIGZvciAobGV0IHJlbW92ZWQgb2YgZGlyZWN0b3JpZXMucmVtb3ZlZCkge1xuICAgICAgICBsb2cuc2lsZW50Lmluc3BlY3QubGFiZWxlZChcIiAgWy0tXVwiLCByZW1vdmVkKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChsZXQgYWRkZWQgb2YgZGlyZWN0b3JpZXMuYWRkZWQpIHtcbiAgICAgICAgbG9nLnNpbGVudC5pbnNwZWN0LmxhYmVsZWQoXCIgIFsrK11cIiwgYWRkZWQpO1xuICAgICAgfVxuXG4gICAgICBsb2cuc2lsZW50Lm5ld2xpbmUoKS5oZWFkaW5nKFwiW0RSWS1SVU5dXCIsIFwiRmlsZXNcIik7XG5cbiAgICAgIGZvciAobGV0IHJlbW92ZWQgb2YgZmlsZXMucmVtb3ZlZCkge1xuICAgICAgICBsb2cuc2lsZW50Lmluc3BlY3QubGFiZWxlZChcIiAgWy0tXVwiLCByZW1vdmVkKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChsZXQgYWRkZWQgb2YgZmlsZXMuYWRkZWQpIHtcbiAgICAgICAgbG9nLnNpbGVudC5pbnNwZWN0LmxhYmVsZWQoXCIgIFsrK11cIiwgYWRkZWQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jbGFzcyBUcmFuc3BpbGVUYXNrIHtcbiAgc3RhdGljIGNyZWF0ZShpbnB1dDogQWJzb2x1dGVQYXRoLCBvdXRwdXQ6IEFic29sdXRlUGF0aCk6IFRyYW5zcGlsZVRhc2sge1xuICAgIHJldHVybiBuZXcgVHJhbnNwaWxlVGFzayhpbnB1dCwgb3V0cHV0KTtcbiAgfVxuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgcmVhZG9ubHkgaW5wdXQ6IEFic29sdXRlUGF0aCxcbiAgICByZWFkb25seSBvdXRwdXQ6IEFic29sdXRlUGF0aFxuICApIHt9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHdvcmtzcGFjZVBhY2thZ2VzKHJvb3Q6IHN0cmluZywgZmlsdGVyOiBzdHJpbmcpIHtcbiAgbGV0IHN0ZG91dCA9IGF3YWl0IGV4ZWMoXG4gICAgc2hgcG5wbSBtIGxzIC0tZmlsdGVyIC4vJHtmaWx0ZXJ9IC0tZGVwdGggLTEgLS1wb3JjZWxhaW5gXG4gICk7XG5cbiAgaWYgKHN0ZG91dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgcmV0dXJuIHN0ZG91dFxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoKGZpbGUpID0+IGZpbGUgIT09IFwiXCIgJiYgZmlsZSAhPT0gcm9vdClcbiAgICAubWFwKChwKSA9PiBwYXRoLnJlbGF0aXZlKHJvb3QsIHApKTtcbn1cblxuaW50ZXJmYWNlIEV4ZWNFcnJvck9wdGlvbnMgZXh0ZW5kcyBFcnJvck9wdGlvbnMge1xuICBjb2RlOiBudW1iZXIgfCBudWxsO1xuICBjb21tYW5kOiBzdHJpbmc7XG59XG5cbmNsYXNzIEV4ZWNFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgcmVhZG9ubHkgI2NvZGU6IG51bWJlciB8IG51bGw7XG4gIHJlYWRvbmx5ICNjb21tYW5kOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nLCBvcHRpb25zOiBFeGVjRXJyb3JPcHRpb25zKSB7XG4gICAgc3VwZXIobWVzc2FnZSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLiNjb2RlID0gb3B0aW9ucy5jb2RlO1xuICAgIHRoaXMuI2NvbW1hbmQgPSBvcHRpb25zLmNvbW1hbmQ7XG5cbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgfVxuXG4gIGdldCBjb2RlKCk6IG51bWJlciB8IFwidW5rbm93blwiIHtcbiAgICByZXR1cm4gdGhpcy4jY29kZSA/PyBcInVua25vd25cIjtcbiAgfVxuXG4gIGdldCBtZXNzYWdlKCk6IHN0cmluZyB7XG4gICAgbGV0IG1lc3NhZ2UgPSBzdXBlci5tZXNzYWdlO1xuICAgIGxldCBoZWFkZXIgPSBgRXhlYyBGYWlsZWQgd2l0aCBjb2RlPSR7dGhpcy5jb2RlfVxcbiAgKGluICR7dGhpcy4jY29tbWFuZH0pYDtcblxuICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICByZXR1cm4gYCR7aGVhZGVyfVxcblxcbiR7bWVzc2FnZX1gO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaGVhZGVyO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBleGVjKGNvbW1hbmQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgoZnVsZmlsbCwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGNoaWxkID0gc2hlbGwuZXhlYyhjb21tYW5kLCB7IHNpbGVudDogdHJ1ZSwgYXN5bmM6IHRydWUgfSk7XG5cbiAgICBsZXQgc3Rkb3V0ID0gcmVhZEFsbChjaGlsZC5zdGRvdXQpO1xuICAgIGxldCBzdGRlcnIgPSByZWFkQWxsKGNoaWxkLnN0ZGVycik7XG5cbiAgICBjaGlsZC5vbihcImVycm9yXCIsIChlcnIpID0+IHJlamVjdChlcnIpKTtcbiAgICBjaGlsZC5vbihcImV4aXRcIiwgYXN5bmMgKGNvZGUpID0+IHtcbiAgICAgIGxvZyhcImV4ZWMgc3RhdHVzXCIsIHsgY29kZSwgc3Rkb3V0OiBhd2FpdCBzdGRvdXQgfSk7XG5cbiAgICAgIGlmIChjb2RlID09PSAwKSB7XG4gICAgICAgIGZ1bGZpbGwoYXdhaXQgc3Rkb3V0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZyhcImV4ZWMgZXJyb3JcIiwge1xuICAgICAgICAgIGVycm9yOiBhd2FpdCBzdGRlcnIsXG4gICAgICAgICAgb3V0OiBhd2FpdCBzdGRvdXQsXG4gICAgICAgICAgY29kZSxcbiAgICAgICAgICBjb21tYW5kLFxuICAgICAgICB9KTtcbiAgICAgICAgcmVqZWN0KG5ldyBFeGVjRXJyb3IoKGF3YWl0IHN0ZGVycikgPz8gXCJcIiwgeyBjb2RlLCBjb21tYW5kIH0pKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbmludGVyZmFjZSBSZWFkYWJsZVN0cmVhbSBleHRlbmRzIE5vZGVKUy5SZWFkYWJsZVN0cmVhbSB7XG4gIGNsb3NlZD86IGJvb2xlYW47XG4gIGRlc3Ryb3llZD86IGJvb2xlYW47XG4gIGRlc3Ryb3k/KCk6IHZvaWQ7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlYWRBbGwoXG4gIHJlYWRhYmxlPzogUmVhZGFibGVTdHJlYW0gfCBudWxsXG4pOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xuICBpZiAocmVhZGFibGUgPT09IHVuZGVmaW5lZCB8fCByZWFkYWJsZSA9PT0gbnVsbCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCByZXN1bHQgPSBhd2FpdCBuZXcgUHJvbWlzZVJlYWRhYmxlKHJlYWRhYmxlKS5yZWFkQWxsKCk7XG5cbiAgaWYgKHJlc3VsdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSBlbHNlIGlmICh0eXBlb2YgcmVzdWx0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcmVzdWx0LnRvU3RyaW5nKFwidXRmLThcIik7XG4gIH1cbn1cblxuY29uc3QgUEFSVFNfTUFUQ0hFUiA9IC9eKD88ZmlsZT5bXi5dKikoPzpbLl0oPzxleHQ+LiopKT8kLztcblxuaW50ZXJmYWNlIEZpbGVQYXJ0cyB7XG4gIHJlYWRvbmx5IHBhcmVudDogc3RyaW5nIHwgbnVsbDtcbiAgcmVhZG9ubHkgYmFzZW5hbWU6IHtcbiAgICByZWFkb25seSBmaWxlOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgZXh0OiBzdHJpbmcgfCBudWxsO1xuICB9O1xuICByZWFkb25seSBraW5kPzogQWJzb2x1dGVQYXRoS2luZDtcbn1cblxuZnVuY3Rpb24gZ2V0UGFydHMoZmlsZW5hbWU6IHN0cmluZyk6IEZpbGVQYXJ0cyB7XG4gIGxldCBwYXJlbnQgPSBnZXRQYXJlbnQoZmlsZW5hbWUpO1xuICBsZXQgYmFzZW5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGVuYW1lKTtcblxuICBsZXQgZXh0ZW5zaW9uID0gYmFzZW5hbWUubWF0Y2goUEFSVFNfTUFUQ0hFUik7XG5cbiAgaWYgKGV4dGVuc2lvbiA9PT0gbnVsbCkge1xuICAgIHJldHVybiB7IHBhcmVudCwgYmFzZW5hbWU6IHsgZmlsZTogYmFzZW5hbWUsIGV4dDogbnVsbCB9IH07XG4gIH1cblxuICBsZXQgeyBmaWxlLCBleHQgfSA9IGV4dGVuc2lvbi5ncm91cHMhO1xuXG4gIHJldHVybiB7XG4gICAgcGFyZW50LFxuICAgIGJhc2VuYW1lOiB7IGZpbGUsIGV4dCB9LFxuICAgIGtpbmQ6IHBhcmVudCA9PT0gbnVsbCA/IFwicm9vdFwiIDogdW5kZWZpbmVkLFxuICB9O1xuXG4gIC8vIGxldCBbLCBiYXNlbmFtZSwgZXh0bmFtZV07XG59XG5cbmZ1bmN0aW9uIGdldFBhcmVudChmaWxlbmFtZTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGxldCBwYXJlbnQgPSBwYXRoLmRpcm5hbWUoZmlsZW5hbWUpO1xuICBsZXQgcm9vdCA9IHBhdGgucGFyc2UocGFyZW50KS5yb290O1xuXG4gIGlmIChmaWxlbmFtZSA9PT0gcm9vdCkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwYXJlbnQ7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2hhbmdlRXh0ZW5zaW9uKGZpbGU6IHN0cmluZywgdG86IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlLCBwYXRoLmV4dG5hbWUoZmlsZSkpO1xuICByZXR1cm4gcGF0aC5qb2luKHBhdGguZGlybmFtZShmaWxlKSwgYCR7YmFzZW5hbWV9LiR7dG99YCk7XG59XG5cbmZ1bmN0aW9uIGV4aGF1c3RpdmUodmFsdWU6IG5ldmVyLCBkZXNjcmlwdGlvbjogc3RyaW5nKTogbmV2ZXIge1xuICB0aHJvdyBFcnJvcihgRXhwZWN0ZWQgJHtkZXNjcmlwdGlvbn0gdG8gYmUgZXhoYXVzdGl2ZWx5IGNoZWNrZWRgKTtcbn1cblxuY29uc3QgTEFCRUwgPSBTeW1ib2woXCJMQUJFTFwiKTtcbnR5cGUgTEFCRUwgPSB0eXBlb2YgTEFCRUw7XG5cbmludGVyZmFjZSBMYWJlbCB7XG4gIHJlYWRvbmx5IFtMQUJFTF06IHJlYWRvbmx5IHN0cmluZ1tdO1xufVxuXG5mdW5jdGlvbiBMYWJlbCguLi5sYWJlbDogc3RyaW5nW10pOiBMYWJlbCB7XG4gIHJldHVybiB7IFtMQUJFTF06IGxhYmVsIH07XG59XG5cbmZ1bmN0aW9uIGlzTGFiZWwodmFsdWU6IHVua25vd24pOiB2YWx1ZSBpcyBMYWJlbCB7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwib2JqZWN0XCIgJiYgdmFsdWUgIT09IG51bGwgJiYgTEFCRUwgaW4gdmFsdWU7XG59XG5cbmludGVyZmFjZSBMb2cge1xuICAodmFsdWU6IHVua25vd24pOiBMb2c7XG4gIChsYWJlbDogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IExvZztcbiAgKGxhYmVsOiB1bmtub3duKTogTG9nO1xuXG4gIHJlYWRvbmx5IGxvZzogTG9nO1xuICByZWFkb25seSBzaWxlbnQ6IExvZztcblxuICBuZXdsaW5lKCk6IExvZztcbiAgaGVhZGluZyguLi5sYWJlbDogc3RyaW5nW10pOiBMb2c7XG5cbiAgcmVhZG9ubHkgaW5zcGVjdDoge1xuICAgICh2YWx1ZTogdW5rbm93biwgb3B0aW9ucz86IHV0aWwuSW5zcGVjdE9wdGlvbnMpOiBMb2c7XG4gICAgbGFiZWxlZChcbiAgICAgIGxhYmVsOiBzdHJpbmcgfCBMYWJlbCxcbiAgICAgIHZhbHVlOiB1bmtub3duLFxuICAgICAgb3B0aW9ucz86IHV0aWwuSW5zcGVjdE9wdGlvbnNcbiAgICApOiBMb2c7XG4gIH07XG59XG5cbmNvbnN0IFNJTEVOVDogTG9nID0gKCgpID0+IHtcbiAgY29uc3QgbG9nID0gKC4uLmFyZ3M6IHVua25vd25bXSk6IExvZyA9PiBTSUxFTlQ7XG4gIGxvZy5sb2cgPSBsb2c7XG4gIGxvZy5zaWxlbnQgPSBsb2c7XG5cbiAgbG9nLm5ld2xpbmUgPSAoKSA9PiBsb2c7XG4gIGxvZy5oZWFkaW5nID0gKC4uLmxhYmVsOiBzdHJpbmdbXSkgPT4gbG9nO1xuXG4gIGNvbnN0IGluc3BlY3QgPSAodmFsdWU6IHVua25vd24sIG9wdGlvbnM/OiB1dGlsLkluc3BlY3RPcHRpb25zKSA9PiBsb2c7XG4gIGluc3BlY3QubGFiZWxlZCA9ICguLi5hcmdzOiB1bmtub3duW10pOiBMb2cgPT4gbG9nO1xuICBsb2cuaW5zcGVjdCA9IGluc3BlY3Q7XG5cbiAgcmV0dXJuIGxvZztcbn0pKCk7XG5cbmZ1bmN0aW9uIGxvZyh2YWx1ZTogdW5rbm93bik6IExvZztcbmZ1bmN0aW9uIGxvZyhsYWJlbDogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IExvZztcbmZ1bmN0aW9uIGxvZyhsYWJlbDogdW5rbm93bik6IExvZztcbmZ1bmN0aW9uIGxvZyhcbiAgLi4uYXJnczogW3ZhbHVlOiB1bmtub3duXSB8IFtsYWJlbDogc3RyaW5nLCB2YWx1ZTogdW5rbm93bl0gfCBbTGFiZWxdXG4pOiBMb2cge1xuICBpZiAoYXJncy5sZW5ndGggPT09IDIpIHtcbiAgICBsZXQgW2xhYmVsLCB2YWx1ZV0gPSBhcmdzO1xuICAgIGNvbnNvbGUubG9nKGxhYmVsLCB1dGlsLmluc3BlY3QodmFsdWUsIHsgZGVwdGg6IG51bGwsIGNvbG9yczogdHJ1ZSB9KSk7XG4gIH0gZWxzZSB7XG4gICAgbGV0IFt2YWx1ZV0gPSBhcmdzO1xuXG4gICAgaWYgKGlzTGFiZWwodmFsdWUpKSB7XG4gICAgICBjb25zb2xlLmxvZyguLi52YWx1ZVtMQUJFTF0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyh1dGlsLmluc3BlY3QodmFsdWUsIHsgZGVwdGg6IG51bGwsIGNvbG9yczogdHJ1ZSB9KSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGxvZztcbn1cblxubG9nLnNpbGVudCA9IGxvZztcbmxvZy5sb2cgPSBsb2c7XG5cbmxvZy5uZXdsaW5lID0gKCk6IHR5cGVvZiBsb2cgPT4ge1xuICBjb25zb2xlLmxvZyhcIlxcblwiKTtcbiAgcmV0dXJuIGxvZztcbn07XG5cbmxvZy5oZWFkaW5nID0gKC4uLmxhYmVsOiBzdHJpbmdbXSk6IHR5cGVvZiBsb2cgPT4ge1xuICBjb25zb2xlLmxvZyguLi5sYWJlbCk7XG4gIHJldHVybiBsb2c7XG59O1xuXG5jb25zdCBsb2dMYWJlbGVkID0gKFxuICBsYWJlbDogc3RyaW5nIHwgTGFiZWwsXG4gIHZhbHVlOiB1bmtub3duLFxuICBvcHRpb25zPzogdXRpbC5JbnNwZWN0T3B0aW9uc1xuKTogdHlwZW9mIGxvZyA9PiB7XG4gIGxvZ0xhYmVsZWRWYWx1ZShsYWJlbCwgdmFsdWUsIG9wdGlvbnMpO1xuICByZXR1cm4gbG9nO1xufTtcblxuY29uc3QgbG9nSW5zcGVjdCA9IChcbiAgdmFsdWU6IHVua25vd24sXG4gIG9wdGlvbnM/OiB1dGlsLkluc3BlY3RPcHRpb25zXG4pOiB0eXBlb2YgbG9nID0+IHtcbiAgY29uc29sZS5sb2coaW5zcGVjdCh2YWx1ZSwgb3B0aW9ucykpO1xuICByZXR1cm4gbG9nO1xufTtcblxubG9nSW5zcGVjdC5sYWJlbGVkID0gbG9nTGFiZWxlZDtcblxubG9nLmluc3BlY3QgPSBsb2dJbnNwZWN0O1xuXG5mdW5jdGlvbiBsb2dMYWJlbGVkVmFsdWUoXG4gIGxhYmVsOiBzdHJpbmcgfCBMYWJlbCxcbiAgdmFsdWU6IHVua25vd24sXG4gIG9wdGlvbnM6IHV0aWwuSW5zcGVjdE9wdGlvbnMgPSB7fVxuKTogdm9pZCB7XG4gIGlmIChpc0xhYmVsKGxhYmVsKSkge1xuICAgIGNvbnNvbGUubG9nKC4uLmxhYmVsW0xBQkVMXSwgaW5zcGVjdCh2YWx1ZSwgb3B0aW9ucykpO1xuICB9IGVsc2Uge1xuICAgIGNvbnNvbGUubG9nKGxhYmVsLCBpbnNwZWN0KHZhbHVlLCBvcHRpb25zKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW5zcGVjdCh2YWx1ZTogdW5rbm93biwgb3B0aW9uczogdXRpbC5JbnNwZWN0T3B0aW9ucyA9IHt9KTogc3RyaW5nIHtcbiAgcmV0dXJuIHV0aWwuaW5zcGVjdCh2YWx1ZSwgeyAuLi5vcHRpb25zLCBkZXB0aDogbnVsbCwgY29sb3JzOiB0cnVlIH0pO1xufVxuXG5mdW5jdGlvbiBsb2dnZWQ8VD4odmFsdWU6IFQsIGRlc2NyaXB0aW9uOiBzdHJpbmcsIHNob3VsZExvZyA9IHRydWUpOiBUIHtcbiAgaWYgKHNob3VsZExvZykge1xuICAgIGNvbnNvbGUubG9nKFxuICAgICAgZGVzY3JpcHRpb24sXG4gICAgICBcIj1cIixcbiAgICAgIHV0aWwuaW5zcGVjdCh2YWx1ZSwgeyBkZXB0aDogbnVsbCwgY29sb3JzOiB0cnVlIH0pXG4gICAgKTtcbiAgfVxuICByZXR1cm4gdmFsdWU7XG59XG4iXX0=