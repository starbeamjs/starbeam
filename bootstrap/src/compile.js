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
        else {
            for (let removed of directories.removed) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbXBpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3ZDLE9BQU8sVUFBVSxNQUFNLFdBQVcsQ0FBQztBQUNuQyxPQUFPLEtBQUssRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNsQyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sTUFBTSxDQUFDO0FBQ2xDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNuRCxPQUFPLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNsQyxPQUFPLEtBQUssTUFBTSxTQUFTLENBQUM7QUFDNUIsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUM7QUFFN0IsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUVoRSxNQUFNLE9BQU8sU0FBUztJQUNwQjs7T0FFRztJQUNILE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQVksRUFBRSxTQUFpQjtRQUNqRCxJQUFJLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUVyRCxJQUFJLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQzlCLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxFQUFFO1lBQzlCLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3pELElBQUksR0FBRyxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUM1RCxJQUFJ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dkQ7U0FBTTtRQUNMLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztLQUM3QztBQUNILENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxLQUFjLEVBQUUsVUFBK0IsRUFBRTtJQUNoRSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUN4RSxDQUFDO0FBRUQsU0FBUyxNQUFNLENBQUksS0FBUSxFQUFFLFdBQW1CLEVBQUUsU0FBUyxHQUFHLElBQUk7SUFDaEUsSUFBSSxTQUFTLEVBQUU7UUFDYixPQUFPLENBQUMsR0FBRyxDQUNULFdBQVcsRUFDWCxHQUFHLEVBQ0gsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUNuRCxDQUFDO0tBQ0g7SUFDRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBkaWZmIH0gZnJvbSBcImZhc3QtYXJyYXktZGlmZlwiO1xuaW1wb3J0IHNlYXJjaEdsb2IgZnJvbSBcImZhc3QtZ2xvYlwiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzL3Byb21pc2VzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBpc0Fic29sdXRlIH0gZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IFByb21pc2VSZWFkYWJsZSB9IGZyb20gXCJwcm9taXNlLXJlYWRhYmxlXCI7XG5pbXBvcnQgc2ggZnJvbSBcInNoZWxsLWVzY2FwZS10YWdcIjtcbmltcG9ydCBzaGVsbCBmcm9tIFwic2hlbGxqc1wiO1xuaW1wb3J0ICogYXMgdXRpbCBmcm9tIFwidXRpbFwiO1xuXG5leHBvcnQgY29uc3QgSU5TUEVDVCA9IFN5bWJvbC5mb3IoXCJub2RlanMudXRpbC5pbnNwZWN0LmN1c3RvbVwiKTtcblxuZXhwb3J0IGNsYXNzIFdvcmtzcGFjZSB7XG4gIC8qKlxuICAgKiBAcGFyYW0gcm9vdCB0aGUgcm9vdCBvZiB0aGUgd29ya3NwYWNlLCBhcyBhbiBhYnNvbHV0ZSBkaXJlY3RvcnlcbiAgICovXG4gIHN0YXRpYyBhc3luYyBjcmVhdGUocm9vdDogc3RyaW5nLCBuYW1lc3BhY2U6IHN0cmluZykge1xuICAgIGxldCBwYXRocyA9IGF3YWl0IHdvcmtzcGFjZVBhY2thZ2VzKHJvb3QsIG5hbWVzcGFjZSk7XG5cbiAgICBsZXQgcGFja2FnZXMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgIHBhdGhzLm1hcChhc3luYyAocGFja2FnZVJvb3QpID0+IHtcbiAgICAgICAgbGV0IG1hbmlmZXN0ID0gcGF0aC5yZXNvbHZlKHBhY2thZ2VSb290LCBcInBhY2thZ2UuanNvblwiKTtcbiAgICAgICAgbGV0IGJ1ZiA9IGF3YWl0IGZzLnJlYWRGaWxlKG1hbmlmZXN0LCB7IGVuY29kaW5nOiBcInV0ZjhcIiB9KTtcbiAgICAgICAgbGV0IGpzb246IEpzb25PYmplY3QgPSBKU09OLnBhcnNlKGJ1Zik7XG5cbiAgICAgICAgbGV0IHJvb3QgPSBwYXRoLmRpcm5hbWUobWFuaWZlc3QpO1xuICAgICAgICBsZXQgbmFtZSA9IHBhdGguYmFzZW5hbWUocm9vdCk7XG5cbiAgICAgICAgcmV0dXJuIFBhY2thZ2UuY3JlYXRlKCgpID0+IHdvcmtzcGFjZSwgbmFtZSwganNvbik7XG4gICAgICB9KVxuICAgICk7XG5cbiAgICBjb25zdCB3b3Jrc3BhY2U6IFdvcmtzcGFjZSA9IG5ldyBXb3Jrc3BhY2Uocm9vdCwgbmFtZXNwYWNlLCBwYWNrYWdlcyk7XG4gICAgcmV0dXJuIHdvcmtzcGFjZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgbnBtIG5hbWVzcGFjZSAoZS5nLiB0aGUgI25hbWVzcGFjZSBvZiBgQHN0YXJiZWFtL2NvcmVgIGlzIGBAc3RhcmJlYW1gKVxuICAgKi9cbiAgcmVhZG9ubHkgI25hbWVzcGFjZTogc3RyaW5nO1xuICAvKipcbiAgICogVGhlIHJvb3Qgb2YgdGhlIHdvcmtzcGFjZSwgYXMgYW4gYWJzb2x1dGUgZGlyZWN0b3J5XG4gICAqL1xuICByZWFkb25seSAjcm9vdDogc3RyaW5nO1xuXG4gICNwYWNrYWdlczogcmVhZG9ubHkgUGFja2FnZVtdO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgcm9vdDogc3RyaW5nLFxuICAgIG5hbWVzcGFjZTogc3RyaW5nLFxuICAgIHBhY2thZ2VzOiByZWFkb25seSBQYWNrYWdlW11cbiAgKSB7XG4gICAgdGhpcy4jcm9vdCA9IHJvb3Q7XG4gICAgdGhpcy4jbmFtZXNwYWNlID0gbmFtZXNwYWNlO1xuICAgIHRoaXMuI3BhY2thZ2VzID0gcGFja2FnZXM7XG4gIH1cblxuICBnZXQgcm9vdCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLiNyb290O1xuICB9XG5cbiAgZ2V0IHBhY2thZ2VzKCk6IHJlYWRvbmx5IFBhY2thZ2VbXSB7XG4gICAgcmV0dXJuIHRoaXMuI3BhY2thZ2VzO1xuICB9XG5cbiAgZ2V0IG5hbWVzcGFjZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLiNuYW1lc3BhY2U7XG4gIH1cbn1cblxudHlwZSBKc29uVmFsdWUgPSBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCB8IEpzb25BcnJheSB8IEpzb25PYmplY3Q7XG50eXBlIEpzb25BcnJheSA9IHJlYWRvbmx5IEpzb25WYWx1ZVtdO1xudHlwZSBKc29uT2JqZWN0ID0geyBbUCBpbiBzdHJpbmddOiBKc29uVmFsdWUgfTtcblxuY2xhc3MgUGFja2FnZSB7XG4gIHN0YXRpYyBjcmVhdGUoXG4gICAgd29ya3NwYWNlOiAoKSA9PiBXb3Jrc3BhY2UsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIG1hbmlmZXN0OiBKc29uT2JqZWN0XG4gICk6IFBhY2thZ2Uge1xuICAgIHJldHVybiBuZXcgUGFja2FnZSh3b3Jrc3BhY2UsIG5hbWUsIG1hbmlmZXN0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgd29ya3NwYWNlIHRoYXQgdGhpcyBwYWNrYWdlIGJlbG9uZ3MgdG8uIEl0J3MgYSB0aHVuayBiZWNhdXNlIHdvcmtzcGFjZXNcbiAgICogYW5kIHBhY2thZ2VzIGFyZSBjeWNsaWMgYW5kIGhhdmUgdG8gYmUgaW5pdGlhbGl6ZWQgdG9nZXRoZXIuXG4gICAqL1xuICByZWFkb25seSAjd29ya3NwYWNlVGh1bms6ICgpID0+IFdvcmtzcGFjZTtcblxuICAvKipcbiAgICogVGhlIG5hbWUgb2YgdGhlIHBhY2thZ2UuIEZvciBleGFtcGxlLCBgI25hbWVgIG9mIGBAc3RhcmJlYW0vY29yZWAgaXMgYGNvcmVgXG4gICAqL1xuICByZWFkb25seSAjbG9jYWxOYW1lOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIFRoZSBwYXJzZWQgcGFja2FnZS5qc29uXG4gICAqL1xuICByZWFkb25seSAjbWFuaWZlc3Q6IEpzb25PYmplY3Q7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICB3b3Jrc3BhY2U6ICgpID0+IFdvcmtzcGFjZSxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgbWFuaWZlc3Q6IEpzb25PYmplY3RcbiAgKSB7XG4gICAgdGhpcy4jd29ya3NwYWNlVGh1bmsgPSB3b3Jrc3BhY2U7XG4gICAgdGhpcy4jbG9jYWxOYW1lID0gbmFtZTtcbiAgICB0aGlzLiNtYW5pZmVzdCA9IG1hbmlmZXN0O1xuICB9XG5cbiAgZ2V0ICN3b3Jrc3BhY2UoKTogV29ya3NwYWNlIHtcbiAgICByZXR1cm4gdGhpcy4jd29ya3NwYWNlVGh1bmsoKTtcbiAgfVxuXG4gIGdldCBuYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke3RoaXMuI3dvcmtzcGFjZS5uYW1lc3BhY2V9LyR7dGhpcy4jbG9jYWxOYW1lfWA7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHJvb3Qgb2YgdGhpcyBwYWNrYWdlLCB3aGljaCBjb250YWlucyB0aGUgcGFja2FnZS5qc29uXG4gICAqL1xuICBnZXQgcm9vdCgpOiBBYnNvbHV0ZVBhdGgge1xuICAgIHJldHVybiBBYnNvbHV0ZVBhdGguZGlyZWN0b3J5KFxuICAgICAgcGF0aC5yZXNvbHZlKFxuICAgICAgICB0aGlzLiN3b3Jrc3BhY2Uucm9vdCxcbiAgICAgICAgdGhpcy4jd29ya3NwYWNlLm5hbWVzcGFjZSxcbiAgICAgICAgdGhpcy4jbG9jYWxOYW1lXG4gICAgICApXG4gICAgKTtcbiAgfVxuXG4gIGdldCBwYWNrYWdlSlNPTigpOiBzdHJpbmcge1xuICAgIHJldHVybiBwYXRoLnJlc29sdmUodGhpcy4jd29ya3NwYWNlLnJvb3QpO1xuICB9XG5cbiAgYXN5bmMgY29tcGlsZSh7IGRyeVJ1biB9OiB7IGRyeVJ1bjogYm9vbGVhbiB9ID0geyBkcnlSdW46IGZhbHNlIH0pIHtcbiAgICAvLyBsZXQgcm9vdCA9IHRoaXMucm9vdDtcbiAgICAvLyBsZXQgZGlzdCA9IHBhdGguam9pbih0aGlzLnJvb3QsIFwiZGlzdFwiKTtcblxuICAgIGxldCB0cmFuc3BpbGF0aW9uID0gYXdhaXQgdGhpcy4jcGFja2FnZVRyYW5zcGlsYXRpb24oKTtcbiAgICBsZXQgcHJlcGFyZSA9IHRyYW5zcGlsYXRpb24ucHJlcGFyZShhd2FpdCB0aGlzLiNnZXREaXN0RmlsZXMoKSk7XG5cbiAgICBwcmVwYXJlLnJ1bih7IGRyeVJ1biB9KTtcblxuICAgIC8vIGNvbnNvbGUubG9nKHsgZmlsZXMsIGRpcmVjdG9yaWVzIH0pO1xuXG4gICAgLy8gZm9yIChsZXQgdGFzayBvZiBmaWxlcykge1xuICAgIC8vICAgLy8gY29uc29sZS5sb2codGFzayk7XG4gICAgLy8gfVxuXG4gICAgLy8gbGV0IGZpbGVzID0gYXdhaXQgZ2xvYihgJHtyb290fS8hKG5vZGVfbW9kdWxlcykqKi8qLnRzYCk7XG5cbiAgICAvLyAvLyBjb25zb2xlLmxvZyh7IGZpbGVzIH0pO1xuXG4gICAgLy8gZm9yIChsZXQgZmlsZSBvZiBmaWxlcykge1xuICAgIC8vICAgaWYgKGZpbGUuZW5kc1dpdGgoXCIuZC50c1wiKSkge1xuICAgIC8vICAgICBjb25zb2xlLndhcm4oXG4gICAgLy8gICAgICAgYFVuZXhwZWN0ZWQgLmQudHMgZmlsZSBmb3VuZCBkdXJpbmcgY29tcGlsYXRpb24gKCR7ZmlsZX0pYFxuICAgIC8vICAgICApO1xuICAgIC8vICAgICBjb250aW51ZTtcbiAgICAvLyAgIH1cblxuICAgIC8vICAgbGV0IHJlbGF0aXZlID0gcGF0aC5yZWxhdGl2ZShyb290LCBmaWxlKTtcbiAgICAvLyAgIGxldCBvdXRwdXQgPSBhd2FpdCBzd2MudHJhbnNmb3JtRmlsZShmaWxlLCB7XG4gICAgLy8gICAgIHNvdXJjZU1hcHM6IFwiaW5saW5lXCIsXG4gICAgLy8gICAgIGlubGluZVNvdXJjZXNDb250ZW50OiB0cnVlLFxuICAgIC8vICAgICBqc2M6IHtcbiAgICAvLyAgICAgICBwYXJzZXI6IHtcbiAgICAvLyAgICAgICAgIHN5bnRheDogXCJ0eXBlc2NyaXB0XCIsXG4gICAgLy8gICAgICAgICBkZWNvcmF0b3JzOiB0cnVlLFxuICAgIC8vICAgICAgIH0sXG4gICAgLy8gICAgICAgdGFyZ2V0OiBcImVzMjAyMlwiLFxuICAgIC8vICAgICB9LFxuICAgIC8vICAgfSk7XG5cbiAgICAvLyAgIGxldCB0YXJnZXQgPSBjaGFuZ2VFeHRlbnNpb24oYCR7ZGlzdH0vJHtyZWxhdGl2ZX1gLCBcImpzXCIpO1xuXG4gICAgLy8gICBzaGVsbC5ta2RpcihcIi1wXCIsIHBhdGguZGlybmFtZSh0YXJnZXQpKTtcblxuICAgIC8vICAgZnMud3JpdGVGaWxlKHRhcmdldCwgb3V0cHV0LmNvZGUpO1xuICAgIC8vIH1cbiAgfVxuXG4gIGdldCAjZGlzdCgpOiBBYnNvbHV0ZVBhdGgge1xuICAgIHJldHVybiB0aGlzLnJvb3QuZGlyZWN0b3J5KFwiZGlzdFwiKTtcbiAgfVxuXG4gIGFzeW5jICNwYWNrYWdlVHJhbnNwaWxhdGlvbigpOiBQcm9taXNlPFRyYW5zcGlsYXRpb24+IHtcbiAgICBsZXQgZmlsZXMgPSBhd2FpdCBBYnNvbHV0ZVBhdGhzLmdsb2IoXG4gICAgICBgIShub2RlX21vZHVsZXN8ZGlzdCkqKi8qLnRzYCxcbiAgICAgIHRoaXMucm9vdFxuICAgICk7XG5cbiAgICBsZXQgZHRzID0gZmlsZXMuZmlsdGVyKChmaWxlKSA9PiBmaWxlLmhhc0V4YWN0RXh0ZW5zaW9uKFwiZC50c1wiKSk7XG5cbiAgICBmb3IgKGxldCBmaWxlIG9mIGR0cykge1xuICAgICAgY29uc29sZS53YXJuKGBVbmV4cGVjdGVkIC5kLnRzIGZpbGUgZm91bmQgZHVyaW5nIGNvbXBpbGF0aW9uICgke2ZpbGV9KWApO1xuICAgIH1cblxuICAgIGxldCB0cyA9IGZpbGVzXG4gICAgICAuZmlsdGVyKChmaWxlKSA9PiBmaWxlLmhhc0V4YWN0RXh0ZW5zaW9uKFwidHNcIikpXG4gICAgICAuZmlsdGVyKChmaWxlKSA9PiAhZmlsZS5lcSh0aGlzLnJvb3QpKTtcblxuICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKGBbVFMtRklMRVNdYCwgdHMpO1xuXG4gICAgcmV0dXJuIFRyYW5zcGlsYXRpb24uY3JlYXRlKFxuICAgICAgdGhpcy5uYW1lLFxuICAgICAgdHMubWFwQXJyYXkoKGZpbGUpID0+IHRoaXMuI2ZpbGVUcmFuc3BpbGF0aW9uKGZpbGUpKVxuICAgICk7XG5cbiAgICAvLyBsZXQgZmlsZXMgPSBhd2FpdCBnbG9iKGAke3RoaXMucm9vdH0vIShub2RlX21vZHVsZXMpKiovKi50c2ApO1xuXG4gICAgLy8gZm9yIChsZXQgZmlsZSBvZiBmaWxlcykge1xuICAgIC8vICAgaWYgKGZpbGUuZW5kc1dpdGgoXCIuZC50c1wiKSkge1xuICAgIC8vICAgICBjb25zb2xlLndhcm4oXG4gICAgLy8gICAgICAgYFVuZXhwZWN0ZWQgLmQudHMgZmlsZSBmb3VuZCBkdXJpbmcgY29tcGlsYXRpb24gKCR7ZmlsZX0pYFxuICAgIC8vICAgICApO1xuICAgIC8vICAgfVxuICAgIC8vIH1cblxuICAgIC8vIGxldCB0YXNrcyA9IGZpbGVzXG4gICAgLy8gICAuZmlsdGVyKChmaWxlKSA9PiAhZmlsZS5zdGFydHNXaXRoKHRoaXMuI2Rpc3QpKVxuICAgIC8vICAgLmZpbHRlcigoZmlsZSkgPT4gIWZpbGUuZW5kc1dpdGgoXCIuZC50c1wiKSlcbiAgICAvLyAgIC5tYXAoKGZpbGUpID0+IHRoaXMuI2ZpbGVUcmFuc3BpbGF0aW9uKGZpbGUpKTtcblxuICAgIC8vIHJldHVybiBUcmFuc3BpbGF0aW9uLmNyZWF0ZSh0YXNrcyk7XG4gIH1cblxuICBhc3luYyAjZ2V0RGlzdEZpbGVzKCk6IFByb21pc2U8QWJzb2x1dGVQYXRocz4ge1xuICAgIHJldHVybiB0aGlzLiNkaXN0Lmdsb2IoXCIqKlwiLCB7IGtpbmQ6IFwiYWxsXCIgfSk7XG4gIH1cblxuICAjZmlsZVRyYW5zcGlsYXRpb24oaW5wdXRQYXRoOiBBYnNvbHV0ZVBhdGgpOiBUcmFuc3BpbGVUYXNrIHtcbiAgICBsZXQgcmVsYXRpdmVQYXRoID0gaW5wdXRQYXRoLnJlbGF0aXZlRnJvbUFuY2VzdG9yKHRoaXMucm9vdCk7XG5cbiAgICBsb2cuc2lsZW50Lmluc3BlY3QubGFiZWxlZChgW1RSQU5TUElMRV1gLCB7XG4gICAgICBpbnB1dDogaW5wdXRQYXRoLFxuICAgICAgcm9vdDogdGhpcy5yb290LFxuICAgICAgcmVsYXRpdmU6IHJlbGF0aXZlUGF0aCxcbiAgICB9KTtcblxuICAgIGxldCBvdXRwdXQgPSB0aGlzLiNkaXN0LmZpbGUocmVsYXRpdmVQYXRoKS5jaGFuZ2VFeHRlbnNpb24oXCJqc1wiKTtcblxuICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKGBbT1VUUFVUXWAsIG91dHB1dCk7XG5cbiAgICByZXR1cm4gVHJhbnNwaWxlVGFzay5jcmVhdGUoaW5wdXRQYXRoLCBvdXRwdXQpO1xuICB9XG59XG5cbmNsYXNzIFRyYW5zcGlsYXRpb24ge1xuICBzdGF0aWMgY3JlYXRlKG5hbWU6IHN0cmluZywgdGFza3M6IHJlYWRvbmx5IFRyYW5zcGlsZVRhc2tbXSkge1xuICAgIHJldHVybiBuZXcgVHJhbnNwaWxhdGlvbihuYW1lLCB0YXNrcyk7XG4gIH1cblxuICByZWFkb25seSAjbmFtZTogc3RyaW5nO1xuICByZWFkb25seSAjdGFza3M6IHJlYWRvbmx5IFRyYW5zcGlsZVRhc2tbXTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgdGFza3M6IHJlYWRvbmx5IFRyYW5zcGlsZVRhc2tbXSkge1xuICAgIHRoaXMuI25hbWUgPSBuYW1lO1xuICAgIHRoaXMuI3Rhc2tzID0gdGFza3M7XG4gIH1cblxuICBwcmVwYXJlKGV4aXN0aW5nOiBBYnNvbHV0ZVBhdGhzKTogUHJlcGFyZVRyYW5zcGlsYXRpb24ge1xuICAgIHJldHVybiBQcmVwYXJlVHJhbnNwaWxhdGlvbi5jcmVhdGUoXG4gICAgICB0aGlzLiNuYW1lLFxuICAgICAgZXhpc3RpbmcuZGlmZkJ5S2luZCh0aGlzLm91dHB1dFBhdGhzKVxuICAgICk7XG4gIH1cblxuICBnZXQgb3V0cHV0UGF0aHMoKTogQWJzb2x1dGVQYXRocyB7XG4gICAgbGV0IGZpbGVzID0gQWJzb2x1dGVQYXRocy5mcm9tKHRoaXMuI3Rhc2tzLm1hcCgodGFzaykgPT4gdGFzay5vdXRwdXQpKTtcbiAgICBsb2cuc2lsZW50Lmluc3BlY3QubGFiZWxlZChcIltPVVQtRklMRVNdXCIsIGZpbGVzKTtcbiAgICBsZXQgZGlyZWN0b3JpZXMgPSBmaWxlcy5kaXJlY3Rvcnk7XG4gICAgbG9nLnNpbGVudC5pbnNwZWN0LmxhYmVsZWQoXCJbT1VULURJUlNdXCIsIGZpbGVzLmRpcmVjdG9yeSk7XG5cbiAgICByZXR1cm4gZmlsZXMubWVyZ2UoZGlyZWN0b3JpZXMpO1xuICB9XG59XG5cbmFic3RyYWN0IGNsYXNzIE1hcHBhYmxlPFNpbmdsZSwgTXVsdGlwbGU+IHtcbiAgYWJzdHJhY3QgbWFwKG1hcHBlcjogKHBhdGg6IFNpbmdsZSkgPT4gU2luZ2xlIHwgbnVsbCk6IE11bHRpcGxlO1xuXG4gIGFic3RyYWN0IGZsYXRNYXAoXG4gICAgbWFwcGVyOiAocGF0aDogU2luZ2xlKSA9PiByZWFkb25seSBTaW5nbGVbXSB8IE11bHRpcGxlIHwgU2luZ2xlXG4gICk6IE11bHRpcGxlO1xuXG4gIGFic3RyYWN0IGZpbmQoZmluZGVyOiAocGF0aDogU2luZ2xlKSA9PiBib29sZWFuKTogU2luZ2xlIHwgdm9pZDtcblxuICBhYnN0cmFjdCByZWR1Y2U8VT4oXG4gICAgbWFwcGVyOiAoYnVpbGQ6IFUsIHBhdGg6IFNpbmdsZSkgPT4gdm9pZCxcbiAgICBidWlsZDogVSxcbiAgICBzdHJhdGVneTogXCJtdXRhdGVcIlxuICApOiBVO1xuICBhYnN0cmFjdCByZWR1Y2U8VT4oXG4gICAgbWFwcGVyOiAoYWNjdW11bGF0b3I6IFUsIHBhdGg6IFNpbmdsZSkgPT4gdm9pZCxcbiAgICBpbml0aWFsOiBVLFxuICAgIHN0cmF0ZWd5PzogXCJmdW5jdGlvbmFsXCJcbiAgKTogVTtcblxuICBmaWx0ZXIoZmlsdGVyOiAoaXRlbTogU2luZ2xlKSA9PiBib29sZWFuKTogTXVsdGlwbGUge1xuICAgIHJldHVybiB0aGlzLm1hcCgoc2luZ2xlKSA9PiAoZmlsdGVyKHNpbmdsZSkgPyBzaW5nbGUgOiBudWxsKSk7XG4gIH1cblxuICBtYXBBcnJheTxVPihtYXBwZXI6IChpdGVtOiBTaW5nbGUpID0+IFUpOiByZWFkb25seSBVW10ge1xuICAgIHJldHVybiB0aGlzLnJlZHVjZShcbiAgICAgIChhcnJheTogVVtdLCBpdGVtKSA9PiBhcnJheS5wdXNoKG1hcHBlcihpdGVtKSksXG4gICAgICBbXSxcbiAgICAgIFwibXV0YXRlXCJcbiAgICApO1xuICB9XG59XG5cbmludGVyZmFjZSBQYXRoRGlmZiB7XG4gIHJlYWRvbmx5IGFkZGVkOiBBYnNvbHV0ZVBhdGhzO1xuICByZWFkb25seSByZW1vdmVkOiBBYnNvbHV0ZVBhdGhzO1xufVxuXG5pbnRlcmZhY2UgUGF0aERpZmZCeUtpbmQge1xuICByZWFkb25seSBmaWxlczogUGF0aERpZmY7XG4gIHJlYWRvbmx5IGRpcmVjdG9yaWVzOiBQYXRoRGlmZjtcbn1cblxuY2xhc3MgQWJzb2x1dGVQYXRoc1xuICBleHRlbmRzIE1hcHBhYmxlPEFic29sdXRlUGF0aCwgQWJzb2x1dGVQYXRocz5cbiAgaW1wbGVtZW50cyBJdGVyYWJsZTxBYnNvbHV0ZVBhdGg+XG57XG4gIHN0YXRpYyBlbXB0eSgpOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICByZXR1cm4gbmV3IEFic29sdXRlUGF0aHMobmV3IE1hcCgpKTtcbiAgfVxuXG4gIHN0YXRpYyBhc3luYyBhbGwoXG4gICAgaW5zaWRlOiBBYnNvbHV0ZVBhdGgsXG4gICAgb3B0aW9uczogeyBraW5kOiBGaWxlS2luZCB8IFwiYWxsXCIgfSA9IHsga2luZDogXCJyZWd1bGFyXCIgfVxuICApOiBQcm9taXNlPEFic29sdXRlUGF0aHM+IHtcbiAgICByZXR1cm4gQWJzb2x1dGVQYXRocy5nbG9iKFwiKipcIiwgaW5zaWRlLCBvcHRpb25zKTtcbiAgfVxuXG4gIHN0YXRpYyBhc3luYyBnbG9iKFxuICAgIGdsb2I6IHN0cmluZyxcbiAgICBpbnNpZGU6IEFic29sdXRlUGF0aCxcbiAgICB7IGtpbmQgfTogeyBraW5kOiBGaWxlS2luZCB8IFwiYWxsXCIgfSA9IHtcbiAgICAgIGtpbmQ6IFwicmVndWxhclwiLFxuICAgIH1cbiAgKSB7XG4gICAgbGV0IGZ1bGxHbG9iID0gcGF0aC5yZXNvbHZlKEFic29sdXRlUGF0aC5nZXRGaWxlbmFtZShpbnNpZGUpLCBnbG9iKTtcbiAgICByZXR1cm4gQWJzb2x1dGVQYXRocy4jZ2xvYihmdWxsR2xvYiwga2luZCk7XG4gIH1cblxuICBzdGF0aWMgYXN5bmMgI2dsb2IoXG4gICAgZ2xvYjogc3RyaW5nLFxuICAgIGtpbmQ6IEZpbGVLaW5kIHwgXCJhbGxcIlxuICApOiBQcm9taXNlPEFic29sdXRlUGF0aHM+IHtcbiAgICBzd2l0Y2ggKGtpbmQpIHtcbiAgICAgIGNhc2UgXCJkaXJlY3RvcnlcIjoge1xuICAgICAgICByZXR1cm4gQWJzb2x1dGVQYXRocy5tYXJrZWQoXG4gICAgICAgICAgYXdhaXQgc2VhcmNoR2xvYihnbG9iLCB7XG4gICAgICAgICAgICBtYXJrRGlyZWN0b3JpZXM6IHRydWUsXG4gICAgICAgICAgICBvbmx5RGlyZWN0b3JpZXM6IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgY2FzZSBcInJlZ3VsYXJcIjoge1xuICAgICAgICByZXR1cm4gQWJzb2x1dGVQYXRocy5tYXJrZWQoXG4gICAgICAgICAgYXdhaXQgc2VhcmNoR2xvYihnbG9iLCB7XG4gICAgICAgICAgICBvbmx5RmlsZXM6IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgY2FzZSBcImFsbFwiOiB7XG4gICAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGhzLm1hcmtlZChcbiAgICAgICAgICBhd2FpdCBzZWFyY2hHbG9iKGdsb2IsIHtcbiAgICAgICAgICAgIG9ubHlGaWxlczogZmFsc2UsXG4gICAgICAgICAgICBvbmx5RGlyZWN0b3JpZXM6IGZhbHNlLFxuICAgICAgICAgICAgbWFya0RpcmVjdG9yaWVzOiB0cnVlLFxuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgZXhoYXVzdGl2ZShraW5kLCBcImtpbmRcIik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGZyb20ocGF0aHM6IHJlYWRvbmx5IEludG9BYnNvbHV0ZVBhdGhbXSk6IEFic29sdXRlUGF0aHMge1xuICAgIGxldCBzZXQgPSBBYnNvbHV0ZVBhdGhzLmVtcHR5KCk7XG5cbiAgICBmb3IgKGxldCBwYXRoIG9mIHBhdGhzKSB7XG4gICAgICBzZXQuYWRkKEFic29sdXRlUGF0aC5mcm9tKHBhdGgpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2V0O1xuICB9XG5cbiAgc3RhdGljIG1hcmtlZChwYXRoczogSXRlcmFibGU8c3RyaW5nPik6IEFic29sdXRlUGF0aHMge1xuICAgIGxldCBzZXQgPSBBYnNvbHV0ZVBhdGhzLmVtcHR5KCk7XG4gICAgc2V0LmFkZChbLi4ucGF0aHNdLm1hcChBYnNvbHV0ZVBhdGgubWFya2VkKSk7XG4gICAgcmV0dXJuIHNldDtcbiAgfVxuXG4gICNwYXRoczogTWFwPHN0cmluZywgQWJzb2x1dGVQYXRoPjtcblxuICBjb25zdHJ1Y3RvcihwYXRoczogTWFwPHN0cmluZywgQWJzb2x1dGVQYXRoPikge1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy4jcGF0aHMgPSBwYXRocztcbiAgfVxuXG4gIGNsb25lKCk6IEFic29sdXRlUGF0aHMge1xuICAgIHJldHVybiBuZXcgQWJzb2x1dGVQYXRocyhuZXcgTWFwKHRoaXMuI3BhdGhzKSk7XG4gIH1cblxuICBnZXQgc2l6ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLiNwYXRocy5zaXplO1xuICB9XG5cbiAgZ2V0IHJlZ3VsYXJGaWxlcygpOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoKHBhdGgpID0+IChwYXRoLmlzUmVndWxhckZpbGUgPyBwYXRoIDogbnVsbCkpO1xuICB9XG5cbiAgZ2V0IGRpcmVjdG9yaWVzKCk6IEFic29sdXRlUGF0aHMge1xuICAgIHJldHVybiB0aGlzLm1hcCgocGF0aCkgPT4gKHBhdGguaXNEaXJlY3RvcnkgPyBwYXRoIDogbnVsbCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIE1hcCBlYWNoIHBhdGggaW4gdGhpcyBzZXQ6XG4gICAqXG4gICAqIC0gaWYgaXQncyBhIGRpcmVjdG9yeSwgbGVhdmUgaXQgYWxvbmVcbiAgICogLSBpZiBpdCdzIGEgcmVndWxhciBmaWxlLCBnZXQgdGhlIGZpbGUncyBkaXJlY3RvcnlcbiAgICovXG4gIGdldCBkaXJlY3RvcnkoKTogQWJzb2x1dGVQYXRocyB7XG4gICAgcmV0dXJuIHRoaXMubWFwKChwYXRoKSA9PiAocGF0aC5pc0RpcmVjdG9yeSA/IHBhdGggOiBwYXRoLnBhcmVudCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiBhbnkgb2YgdGhlIGZpbGVzIGluIHRoaXMgc2V0IGFyZSBkaXJlY3RvcmllcyB0aGF0IGNvbnRhaW4gdGhpcyBwYXRoXG4gICAqL1xuICBjb250YWlucyhtYXliZUNoaWxkOiBBYnNvbHV0ZVBhdGgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISF0aGlzLmZpbmQoKHBhdGgpID0+IHBhdGguY29udGFpbnMobWF5YmVDaGlsZCkpO1xuICB9XG5cbiAgZGlmZihvdGhlcjogQWJzb2x1dGVQYXRocyk6IHsgYWRkZWQ6IEFic29sdXRlUGF0aHM7IHJlbW92ZWQ6IEFic29sdXRlUGF0aHMgfSB7XG4gICAgbGV0IGRpZmZzID0gZGlmZihcbiAgICAgIFsuLi50aGlzXSxcbiAgICAgIFsuLi5vdGhlcl0sXG4gICAgICAoYSwgYikgPT4gQWJzb2x1dGVQYXRoLmdldEZpbGVuYW1lKGEpID09PSBBYnNvbHV0ZVBhdGguZ2V0RmlsZW5hbWUoYilcbiAgICApO1xuXG4gICAgbGV0IGFkZGVkID0gQWJzb2x1dGVQYXRocy5mcm9tKGRpZmZzLmFkZGVkKTtcbiAgICBsZXQgcmVtb3ZlZCA9IEFic29sdXRlUGF0aHMuZnJvbShkaWZmcy5yZW1vdmVkKS5maWx0ZXIoXG4gICAgICAocGF0aCkgPT4gIWFkZGVkLmhhcyhwYXRoKVxuICAgICk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgYWRkZWQsXG4gICAgICByZW1vdmVkLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogVGhpcyBtZXRob2QgZGlmZnMgZmlsZXMgYW5kIGRpcmVjdG9yaWVzLCBidXQgZXhjbHVkZXMgYW55IHJlbW92ZWQgZmlsZXNcbiAgICogdGhhdCBhcmUgZGVzY2VuZGVudHMgb2YgYSByZW1vdmVkIGRpcmVjdG9yeS5cbiAgICovXG4gIGRpZmZCeUtpbmQob3RoZXI6IEFic29sdXRlUGF0aHMpOiBQYXRoRGlmZkJ5S2luZCB7XG4gICAgbGV0IGRpcmVjdG9yaWVzID0gdGhpcy5kaXJlY3Rvcmllcy5kaWZmKG90aGVyLmRpcmVjdG9yaWVzKTtcblxuICAgIGxvZ1xuICAgICAgLm5ld2xpbmUoKVxuICAgICAgLmhlYWRpbmcoXCJEaXJlY3Rvcmllc1wiKVxuICAgICAgLm5ld2xpbmUoKVxuICAgICAgLmluc3BlY3QubGFiZWxlZChcIltMSFNdXCIsIHRoaXMuZGlyZWN0b3JpZXMpXG4gICAgICAubmV3bGluZSgpXG4gICAgICAuaW5zcGVjdC5sYWJlbGVkKFwiW1JIU11cIiwgb3RoZXIuZGlyZWN0b3JpZXMpXG4gICAgICAubmV3bGluZSgpXG4gICAgICAuaW5zcGVjdC5sYWJlbGVkKFwiW0RJRkZdXCIsIGRpcmVjdG9yaWVzKTtcblxuICAgIGxldCBjb2xsYXBzZWREaXJlY3RvcmllcyA9IGRpcmVjdG9yaWVzLnJlbW92ZWQuY29sbGFwc2VkRGlyZWN0b3JpZXMoKTtcblxuICAgIGxvZy5zaWxlbnQubmV3bGluZSgpLmluc3BlY3QubGFiZWxlZChcIltDTFBTXVwiLCBjb2xsYXBzZWREaXJlY3Rvcmllcyk7XG5cbiAgICBsZXQgZmlsZXMgPSB0aGlzLnJlZ3VsYXJGaWxlcy5kaWZmKG90aGVyLnJlZ3VsYXJGaWxlcyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZmlsZXM6IHtcbiAgICAgICAgYWRkZWQ6IGZpbGVzLmFkZGVkLFxuICAgICAgICByZW1vdmVkOiBmaWxlcy5yZW1vdmVkLnJlbW92ZURlc2NlbmRlbnRzT2YoY29sbGFwc2VkRGlyZWN0b3JpZXMpLFxuICAgICAgfSxcbiAgICAgIGRpcmVjdG9yaWVzOiB7XG4gICAgICAgIGFkZGVkOiBkaXJlY3Rvcmllcy5hZGRlZCxcbiAgICAgICAgcmVtb3ZlZDogY29sbGFwc2VkRGlyZWN0b3JpZXMsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ29sbGFwc2UgYW55IGNoaWxkIGRpcmVjdG9yaWVzIGludG8gdGhlaXIgcGFyZW50cy5cbiAgICovXG4gIGNvbGxhcHNlZERpcmVjdG9yaWVzKCk6IEFic29sdXRlUGF0aHMge1xuICAgIGxldCBjb2xsYXBzZWQgPSBBYnNvbHV0ZVBhdGhzLmVtcHR5KCk7XG5cbiAgICBmb3IgKGxldCB7IHBhdGgsIHJlc3QgfSBvZiB0aGlzLiNkcmFpbigpKSB7XG4gICAgICBjb25zb2xlLmxvZyh7IHBhdGgsIHJlc3QgfSk7XG4gICAgICBpZiAocGF0aC5pc1JlZ3VsYXJGaWxlIHx8ICFyZXN0LmNvbnRhaW5zKHBhdGgpKSB7XG4gICAgICAgIGNvbGxhcHNlZC5hZGQocGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy4jcGF0aHMgPSBjb2xsYXBzZWQuI3BhdGhzO1xuICAgIHJldHVybiBjb2xsYXBzZWQ7XG4gIH1cblxuICByZW1vdmVEZXNjZW5kZW50c09mKGFuY2VzdG9yczogQWJzb2x1dGVQYXRocyk6IEFic29sdXRlUGF0aHMge1xuICAgIHJldHVybiB0aGlzLm1hcCgocGF0aCkgPT4gKGFuY2VzdG9ycy5jb250YWlucyhwYXRoKSA/IG51bGwgOiBwYXRoKSk7XG4gIH1cblxuICBtZXJnZShcbiAgICBwYXRoczogQWJzb2x1dGVQYXRoIHwgQWJzb2x1dGVQYXRocyB8IHJlYWRvbmx5IEFic29sdXRlUGF0aFtdXG4gICk6IEFic29sdXRlUGF0aHMge1xuICAgIGxldCBjbG9uZWQgPSB0aGlzLmNsb25lKCk7XG4gICAgY2xvbmVkLmFkZChwYXRocyk7XG4gICAgcmV0dXJuIGNsb25lZDtcbiAgfVxuXG4gIGFkZChwYXRoczogQWJzb2x1dGVQYXRoIHwgQWJzb2x1dGVQYXRocyB8IHJlYWRvbmx5IEFic29sdXRlUGF0aFtdKTogdm9pZCB7XG4gICAgaWYgKGlzQXJyYXkocGF0aHMpKSB7XG4gICAgICBmb3IgKGxldCBwYXRoIG9mIHBhdGhzKSB7XG4gICAgICAgIHRoaXMuI2FkZChwYXRoKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHBhdGhzIGluc3RhbmNlb2YgQWJzb2x1dGVQYXRocykge1xuICAgICAgZm9yIChsZXQgcGF0aCBvZiBwYXRocykge1xuICAgICAgICB0aGlzLiNhZGQocGF0aCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuI2FkZChwYXRocyk7XG4gICAgfVxuICB9XG5cbiAgI2FkZCguLi5wYXRoczogcmVhZG9ubHkgQWJzb2x1dGVQYXRoW10pOiB2b2lkIHtcbiAgICBmb3IgKGxldCBwYXRoIG9mIHBhdGhzKSB7XG4gICAgICBsZXQgZmlsZW5hbWUgPSBBYnNvbHV0ZVBhdGguZ2V0RmlsZW5hbWUocGF0aCk7XG5cbiAgICAgIGlmICghdGhpcy4jcGF0aHMuaGFzKGZpbGVuYW1lKSkge1xuICAgICAgICB0aGlzLiNwYXRocy5zZXQoZmlsZW5hbWUsIHBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlbW92ZShwYXRoczogQWJzb2x1dGVQYXRocyB8IEFic29sdXRlUGF0aCkge1xuICAgIGxldCB0aGlzUGF0aHMgPSB0aGlzLiNwYXRocztcblxuICAgIGlmIChwYXRocyBpbnN0YW5jZW9mIEFic29sdXRlUGF0aCkge1xuICAgICAgbGV0IGZpbGVuYW1lID0gQWJzb2x1dGVQYXRoLmdldEZpbGVuYW1lKHBhdGhzKTtcbiAgICAgIHRoaXNQYXRocy5kZWxldGUoZmlsZW5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGxldCBmaWxlbmFtZSBvZiBwYXRocy4jcGF0aHMua2V5cygpKSB7XG4gICAgICAgIHRoaXNQYXRocy5kZWxldGUoZmlsZW5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGhhcyhwYXRoOiBBYnNvbHV0ZVBhdGgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy4jcGF0aHMuaGFzKEFic29sdXRlUGF0aC5nZXRGaWxlbmFtZShwYXRoKSk7XG4gIH1cblxuICByZWR1Y2U8VT4oXG4gICAgbWFwcGVyOiAoYnVpbGQ6IFUsIHBhdGg6IEFic29sdXRlUGF0aCkgPT4gdm9pZCxcbiAgICBidWlsZDogVSxcbiAgICBzdHJhdGVneTogXCJtdXRhdGVcIlxuICApOiBVO1xuICByZWR1Y2U8VT4oXG4gICAgbWFwcGVyOiAoYWNjdW11bGF0b3I6IFUsIHBhdGg6IEFic29sdXRlUGF0aCkgPT4gdm9pZCxcbiAgICBpbml0aWFsOiBVLFxuICAgIHN0cmF0ZWd5PzogXCJmdW5jdGlvbmFsXCJcbiAgKTogVTtcbiAgcmVkdWNlPFU+KFxuICAgIG1hcHBlcjogKGJ1aWxkOiBVLCBwYXRoOiBBYnNvbHV0ZVBhdGgpID0+IFUgfCB2b2lkLFxuICAgIGluaXRpYWw6IFUsXG4gICAgc3RyYXRlZ3k6IFwiZnVuY3Rpb25hbFwiIHwgXCJtdXRhdGVcIiA9IFwiZnVuY3Rpb25hbFwiXG4gICk6IFUge1xuICAgIGlmIChzdHJhdGVneSA9PT0gXCJtdXRhdGVcIikge1xuICAgICAgZm9yIChsZXQgcGF0aCBvZiB0aGlzKSB7XG4gICAgICAgIG1hcHBlcihpbml0aWFsLCBwYXRoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGluaXRpYWw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBhY2N1bXVsYXRvciA9IGluaXRpYWw7XG5cbiAgICAgIGZvciAobGV0IHBhdGggb2YgdGhpcykge1xuICAgICAgICBhY2N1bXVsYXRvciA9IG1hcHBlcihhY2N1bXVsYXRvciwgcGF0aCkgYXMgVTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGFjY3VtdWxhdG9yO1xuICAgIH1cbiAgfVxuXG4gIG1hcChtYXBwZXI6IChwYXRoOiBBYnNvbHV0ZVBhdGgpID0+IEFic29sdXRlUGF0aCB8IG51bGwpOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICBsZXQgcGF0aHMgPSBBYnNvbHV0ZVBhdGhzLmVtcHR5KCk7XG5cbiAgICBmb3IgKGxldCBwYXRoIG9mIHRoaXMuI3BhdGhzLnZhbHVlcygpKSB7XG4gICAgICBsZXQgbWFwcGVkUGF0aCA9IG1hcHBlcihwYXRoKTtcblxuICAgICAgaWYgKG1hcHBlZFBhdGgpIHtcbiAgICAgICAgcGF0aHMuYWRkKG1hcHBlZFBhdGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwYXRocztcbiAgfVxuXG4gIGZsYXRNYXAoXG4gICAgbWFwcGVyOiAoXG4gICAgICBwYXRoOiBBYnNvbHV0ZVBhdGhcbiAgICApID0+IHJlYWRvbmx5IEFic29sdXRlUGF0aFtdIHwgQWJzb2x1dGVQYXRocyB8IEFic29sdXRlUGF0aFxuICApOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICBsZXQgcGF0aHMgPSBBYnNvbHV0ZVBhdGhzLmVtcHR5KCk7XG5cbiAgICBmb3IgKGxldCBwYXRoIG9mIHRoaXMuI3BhdGhzLnZhbHVlcygpKSB7XG4gICAgICBwYXRocy5hZGQobWFwcGVyKHBhdGgpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGF0aHM7XG4gIH1cblxuICBmaW5kKGZpbmRlcjogKHBhdGg6IEFic29sdXRlUGF0aCkgPT4gYm9vbGVhbik6IEFic29sdXRlUGF0aCB8IHZvaWQge1xuICAgIGZvciAobGV0IHBhdGggb2YgdGhpcy4jcGF0aHMudmFsdWVzKCkpIHtcbiAgICAgIGxldCBmb3VuZCA9IGZpbmRlcihwYXRoKTtcblxuICAgICAgaWYgKGZvdW5kKSB7XG4gICAgICAgIHJldHVybiBwYXRoO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldCAjc29ydGVkKCk6IE1hcDxzdHJpbmcsIEFic29sdXRlUGF0aD4ge1xuICAgIGxldCBlbnRyaWVzID0gWy4uLnRoaXMuI3BhdGhzLmVudHJpZXMoKV0uc29ydChcbiAgICAgIChbYV0sIFtiXSkgPT4gYi5sZW5ndGggLSBhLmxlbmd0aFxuICAgICk7XG4gICAgcmV0dXJuIG5ldyBNYXAoZW50cmllcyk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSB0aGUgcGF0aHMgaW4gdGhpcyBzZXQuIExhcmdlciBwYXRocyBjb21lIGZpcnN0LlxuICAgKi9cbiAgKiNkcmFpbigpOiBJdGVyYWJsZUl0ZXJhdG9yPHsgcGF0aDogQWJzb2x1dGVQYXRoOyByZXN0OiBBYnNvbHV0ZVBhdGhzIH0+IHtcbiAgICBsZXQgcmVzdCA9IHRoaXMuI3NvcnRlZC5lbnRyaWVzKCk7XG4gICAgbGV0IG5leHQgPSByZXN0Lm5leHQoKTtcblxuICAgIHdoaWxlICghbmV4dC5kb25lKSB7XG4gICAgICBsZXQgWywgcGF0aF0gPSBuZXh0LnZhbHVlO1xuICAgICAgbGV0IHJlc3RQYXRocyA9IG5ldyBBYnNvbHV0ZVBhdGhzKG5ldyBNYXAocmVzdCkpO1xuXG4gICAgICB5aWVsZCB7IHBhdGgsIHJlc3Q6IHJlc3RQYXRocyB9O1xuXG4gICAgICByZXN0ID0gcmVzdFBhdGhzLiNwYXRocy5lbnRyaWVzKCk7XG4gICAgICBuZXh0ID0gcmVzdC5uZXh0KCk7XG4gICAgfVxuICB9XG5cbiAgKltTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAgIGZvciAobGV0IHBhdGggb2YgdGhpcy4jc29ydGVkLnZhbHVlcygpKSB7XG4gICAgICB5aWVsZCBwYXRoO1xuICAgIH1cbiAgfVxuXG4gIFtJTlNQRUNUXSgpIHtcbiAgICByZXR1cm4gWy4uLnRoaXNdO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXk8VCBleHRlbmRzIHVua25vd25bXSB8IHJlYWRvbmx5IHVua25vd25bXT4oXG4gIHZhbHVlOiB1bmtub3duIHwgVFxuKTogdmFsdWUgaXMgVCB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gaXNSb290KHA6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gcGF0aC5wYXJzZShwKS5yb290ID09PSBwO1xufVxuXG50eXBlIEZpbGVLaW5kID0gXCJyZWd1bGFyXCIgfCBcImRpcmVjdG9yeVwiO1xudHlwZSBTZWFyY2hLaW5kID0gRmlsZUtpbmQgfCBcImFsbFwiO1xudHlwZSBBYnNvbHV0ZVBhdGhLaW5kID0gRmlsZUtpbmQgfCBcInJvb3RcIjtcbnR5cGUgSW50b0Fic29sdXRlUGF0aCA9XG4gIHwgQWJzb2x1dGVQYXRoXG4gIHwgRmlsZVBhcnRzXG4gIHwgW2tpbmQ6IEFic29sdXRlUGF0aEtpbmQgfCBcIm1hcmtlZFwiLCBmaWxlbmFtZTogc3RyaW5nXTtcblxuaW50ZXJmYWNlIFNlYXJjaCB7XG4gIGtpbmQ6IFNlYXJjaEtpbmQ7XG59XG5cbmNsYXNzIEFic29sdXRlUGF0aCB7XG4gIHN0YXRpYyBmaWxlKHBhdGg6IHN0cmluZyk6IEFic29sdXRlUGF0aCB7XG4gICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChwYXRoLCBcInJlZ3VsYXJcIiwgXCIuZmlsZVwiKTtcbiAgfVxuXG4gIHN0YXRpYyBmcm9tKGludG9QYXRoOiBJbnRvQWJzb2x1dGVQYXRoKTogQWJzb2x1dGVQYXRoIHtcbiAgICBpZiAoaXNBcnJheShpbnRvUGF0aCkpIHtcbiAgICAgIGxldCBba2luZCwgZmlsZW5hbWVdID0gaW50b1BhdGg7XG5cbiAgICAgIHN3aXRjaCAoa2luZCkge1xuICAgICAgICBjYXNlIFwicm9vdFwiOlxuICAgICAgICBjYXNlIFwiZGlyZWN0b3J5XCI6XG4gICAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC5kaXJlY3RvcnkoZmlsZW5hbWUpO1xuICAgICAgICBjYXNlIFwibWFya2VkXCI6XG4gICAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC5tYXJrZWQoZmlsZW5hbWUpO1xuICAgICAgICBjYXNlIFwicmVndWxhclwiOlxuICAgICAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguZmlsZShmaWxlbmFtZSk7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBleGhhdXN0aXZlKGtpbmQsIFwia2luZFwiKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGludG9QYXRoIGluc3RhbmNlb2YgQWJzb2x1dGVQYXRoKSB7XG4gICAgICByZXR1cm4gaW50b1BhdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB7XG4gICAgICAgIHBhcmVudCxcbiAgICAgICAgYmFzZW5hbWU6IHsgZmlsZSwgZXh0IH0sXG4gICAgICAgIGtpbmQsXG4gICAgICB9ID0gaW50b1BhdGg7XG5cbiAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgaWYgKGV4dCkge1xuICAgICAgICAgIGxldCBmaWxlbmFtZSA9IHBhdGgucmVzb2x2ZShwYXJlbnQsIGAke2ZpbGV9LiR7ZXh0fWApO1xuICAgICAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguI2NoZWNrZWQoZmlsZW5hbWUsIGtpbmQgPz8gXCJyZWd1bGFyXCIsIFwiLmZyb21cIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IGZpbGVuYW1lID0gcGF0aC5yZXNvbHZlKHBhcmVudCwgZmlsZSk7XG4gICAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChmaWxlbmFtZSwga2luZCA/PyBcInJlZ3VsYXJcIiwgXCIuZnJvbVwiKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbm8gcGFyZW50IG1lYW5zIHRoZSBmaWxlIHJlcHJlc2VudHMgdGhlIHJvb3RcbiAgICAgICAgaWYgKHR5cGVvZiBraW5kID09PSBcInN0cmluZ1wiICYmIGtpbmQgIT09IFwicm9vdFwiKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgICAgICBgQlVHOiBnZXRQYXJ0cygpIHByb2R1Y2VkIHsgcGFyZW50OiBudWxsLCBraW5kOiBub3QgJ3Jvb3QnIH0gKGludmFyaWFudCBjaGVjaylgXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguI2NoZWNrZWQoZmlsZSwgXCJyb290XCIsIFwiLmZyb21cIik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGRpcmVjdG9yeShkaXJlY3Rvcnk6IHN0cmluZyk6IEFic29sdXRlUGF0aCB7XG4gICAgaWYgKGlzUm9vdChkaXJlY3RvcnkpKSB7XG4gICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLiNjaGVja2VkKGRpcmVjdG9yeSwgXCJyb290XCIsIFwiLmRpcmVjdG9yeVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChkaXJlY3RvcnksIFwiZGlyZWN0b3J5XCIsIFwiLmRpcmVjdG9yeVwiKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgbWFya2VkKHBhdGg6IHN0cmluZyk6IEFic29sdXRlUGF0aCB7XG4gICAgaWYgKGlzUm9vdChwYXRoKSkge1xuICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChwYXRoLCBcInJvb3RcIiwgXCIubWFya2VkXCIpO1xuICAgIH0gZWxzZSBpZiAocGF0aC5lbmRzV2l0aChcIi9cIikpIHtcbiAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguI2NoZWNrZWQocGF0aCwgXCJkaXJlY3RvcnlcIiwgXCIubWFya2VkXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLiNjaGVja2VkKHBhdGgsIFwicmVndWxhclwiLCBcIi5tYXJrZWRcIik7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljICNjaGVja2VkKFxuICAgIGZpbGVuYW1lOiBzdHJpbmcsXG4gICAga2luZDogXCJyb290XCIgfCBcImRpcmVjdG9yeVwiIHwgXCJyZWd1bGFyXCIsXG4gICAgZnJvbVN0YXRpY01ldGhvZDogc3RyaW5nXG4gICk6IEFic29sdXRlUGF0aCB7XG4gICAgaWYgKGlzQWJzb2x1dGUoZmlsZW5hbWUpKSB7XG4gICAgICByZXR1cm4gbmV3IEFic29sdXRlUGF0aChraW5kLCBmaWxlbmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBgVW5leHBlY3RlZCByZWxhdGl2ZSBwYXRoIHBhc3NlZCB0byBBYnNvbHV0ZVBhdGgke2Zyb21TdGF0aWNNZXRob2R9ICgke3BhdGh9KWBcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGdldEZpbGVuYW1lKHBhdGg6IEFic29sdXRlUGF0aCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHBhdGguI2ZpbGVuYW1lO1xuICB9XG5cbiAgLy8gQSBkaXJlY3RvcnkgZW5kcyB3aXRoIGAvYCwgd2hpbGUgYSBmaWxlIGRvZXMgbm90XG4gIHJlYWRvbmx5ICNraW5kOiBcInJlZ3VsYXJcIiB8IFwiZGlyZWN0b3J5XCIgfCBcInJvb3RcIjtcbiAgcmVhZG9ubHkgI2ZpbGVuYW1lOiBzdHJpbmc7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICBraW5kOiBcInJlZ3VsYXJcIiB8IFwiZGlyZWN0b3J5XCIgfCBcInJvb3RcIixcbiAgICBmaWxlbmFtZTogc3RyaW5nXG4gICkge1xuICAgIHRoaXMuI2tpbmQgPSBraW5kO1xuICAgIHRoaXMuI2ZpbGVuYW1lID0gZmlsZW5hbWU7XG4gIH1cblxuICBnZXQgaXNSb290KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiNraW5kID09PSBcInJvb3RcIjtcbiAgfVxuXG4gIGdldCBpc0RpcmVjdG9yeSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy4ja2luZCA9PT0gXCJkaXJlY3RvcnlcIiB8fCB0aGlzLiNraW5kID09PSBcInJvb3RcIjtcbiAgfVxuXG4gIGdldCBpc1JlZ3VsYXJGaWxlKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLiNraW5kID09PSBcInJlZ3VsYXJcIjtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHBhcmVudCBkaXJlY3Rvcnkgb2YgdGhpcyBBYnNvbHV0ZVBhdGguIElmIHRoaXMgcGF0aCByZXByZXNlbnRzIGFcbiAgICogZmlsZSBzeXN0ZW0gcm9vdCwgYHBhcmVudGAgcmV0dXJucyBudWxsLlxuICAgKi9cbiAgZ2V0IHBhcmVudCgpOiBBYnNvbHV0ZVBhdGggfCBudWxsIHtcbiAgICAvLyBBdm9pZCBpbmZpbml0ZSByZWN1cnNpb24gYXQgdGhlIHJvb3QgKGAvYCBvciBgQzpcXGAsIGV0Yy4pXG4gICAgaWYgKHRoaXMuaXNSb290KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC5kaXJlY3RvcnkocGF0aC5kaXJuYW1lKHRoaXMuI2ZpbGVuYW1lKSk7XG4gICAgfVxuICB9XG5cbiAgZ2V0IGJhc2VuYW1lKCk6IHsgZmlsZTogc3RyaW5nOyBleHQ6IHN0cmluZyB8IG51bGwgfSB7XG4gICAgcmV0dXJuIGdldFBhcnRzKHRoaXMuI2ZpbGVuYW1lKS5iYXNlbmFtZTtcbiAgfVxuXG4gIGdldCBleHRlbnNpb24oKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuYmFzZW5hbWUuZXh0O1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgc3BlY2lmaWVkIGV4dGVuc2lvbiBpcyBhdCB0aGUgZW5kIG9mIHRoZSBmaWxlbmFtZS4gVGhpc1xuICAgKiBtZWFucyB0aGF0IGBpbmRleC5kLnRzYCBoYXMgdGhlIGV4dGVuc2lvbiBgZC50c2AgKmFuZCogYHRzYC5cbiAgICpcbiAgICogU2VlIGhhc0V4YWN0RXh0ZW5zaW9uIGlmIHlvdSB3YW50IGBkLnRzYCB0byBtYXRjaCwgYnV0IG5vdCBgdHNgXG4gICAqL1xuICBoYXNFeHRlbnNpb248UyBleHRlbmRzIGAuJHtzdHJpbmd9YD4oXG4gICAgZXh0ZW5zaW9uOiBTXG4gICk6IGBUaGUgZXh0ZW5zaW9uIHBhc3NlZCB0byBoYXNFeHRlbnNpb24gc2hvdWxkIG5vdCBoYXZlIGEgbGVhZGluZyAnLidgO1xuICBoYXNFeHRlbnNpb24oZXh0ZW5zaW9uOiBzdHJpbmcpOiBib29sZWFuO1xuICBoYXNFeHRlbnNpb24oZXh0ZW5zaW9uOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICBpZiAoZXh0ZW5zaW9uLnN0YXJ0c1dpdGgoXCIuXCIpKSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgYFRoZSBleHRlbnNpb24gcGFzc2VkIHRvIGhhc0V4dGVuc2lvbiBzaG91bGQgbm90IGhhdmUgYSBsZWFkaW5nICcuJ2BcbiAgICAgICk7XG4gICAgfVxuXG4gICAgbGV0IHtcbiAgICAgIGJhc2VuYW1lOiB7IGV4dCB9LFxuICAgIH0gPSBnZXRQYXJ0cyh0aGlzLiNmaWxlbmFtZSk7XG5cbiAgICByZXR1cm4gZXh0ID09PSBleHRlbnNpb247XG4gIH1cblxuICBjaGFuZ2VFeHRlbnNpb248UyBleHRlbmRzIGAuJHtzdHJpbmd9YD4oXG4gICAgZXh0ZW5zaW9uOiBTXG4gICk6IGBUaGUgZXh0ZW5zaW9uIHBhc3NlZCB0byBoYXNFeHRlbnNpb24gc2hvdWxkIG5vdCBoYXZlIGEgbGVhZGluZyAnLidgO1xuICBjaGFuZ2VFeHRlbnNpb24oZXh0ZW5zaW9uOiBzdHJpbmcpOiBBYnNvbHV0ZVBhdGg7XG4gIGNoYW5nZUV4dGVuc2lvbihleHRlbnNpb246IHN0cmluZyk6IHVua25vd24ge1xuICAgIGxldCB7XG4gICAgICBwYXJlbnQsXG4gICAgICBiYXNlbmFtZTogeyBmaWxlIH0sXG4gICAgfSA9IGdldFBhcnRzKHRoaXMuI2ZpbGVuYW1lKTtcblxuICAgIGxldCByZW5hbWVkID0gYCR7ZmlsZX0uJHtleHRlbnNpb259YDtcblxuICAgIGlmIChwYXJlbnQpIHtcbiAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguZmlsZShwYXRoLnJlc29sdmUocGFyZW50LCByZW5hbWVkKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguZmlsZShyZW5hbWVkKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBmaWxlIG1hdGNoZXMgdGhlIGV4YWN0IGV4dGVuc2lvbi4gVGhpcyBtZWFucyB0aGF0XG4gICAqIGBpbmRleC5kLnRzYCBoYXMgdGhlIGV4YWN0IGV4dGVuc2lvbiBgZC50c2AgYnV0ICpub3QqIGB0c2AuXG4gICAqL1xuICBoYXNFeGFjdEV4dGVuc2lvbjxTIGV4dGVuZHMgYC4ke3N0cmluZ31gPihcbiAgICBleHRlbnNpb246IFNcbiAgKTogYFRoZSBleHRlbnNpb24gcGFzc2VkIHRvIGhhc0V4dGVuc2lvbiBzaG91bGQgbm90IGhhdmUgYSBsZWFkaW5nICcuJ2A7XG4gIGhhc0V4YWN0RXh0ZW5zaW9uKGV4dGVuc2lvbjogc3RyaW5nKTogYm9vbGVhbjtcbiAgaGFzRXhhY3RFeHRlbnNpb24oZXh0ZW5zaW9uOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICBpZiAoZXh0ZW5zaW9uLnN0YXJ0c1dpdGgoXCIuXCIpKSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgYFRoZSBleHRlbnNpb24gcGFzc2VkIHRvIGhhc0V4dGVuc2lvbiBzaG91bGQgbm90IGhhdmUgYSBsZWFkaW5nICcuJ2BcbiAgICAgICk7XG4gICAgfVxuXG4gICAgbGV0IHtcbiAgICAgIGJhc2VuYW1lOiB7IGV4dCB9LFxuICAgIH0gPSBnZXRQYXJ0cyh0aGlzLiNmaWxlbmFtZSk7XG5cbiAgICByZXR1cm4gZXh0ID09PSBleHRlbnNpb247XG4gIH1cblxuICBhc3luYyBnbG9iKHNlYXJjaDogU2VhcmNoKTogUHJvbWlzZTxBYnNvbHV0ZVBhdGhzPjtcbiAgYXN5bmMgZ2xvYihnbG9iOiBzdHJpbmcsIHNlYXJjaD86IFNlYXJjaCk6IFByb21pc2U8QWJzb2x1dGVQYXRocz47XG4gIGFzeW5jIGdsb2IoKTogUHJvbWlzZTxBYnNvbHV0ZVBhdGhzPjtcbiAgYXN5bmMgZ2xvYihcbiAgICAuLi5hcmdzOiBbc2VhcmNoOiBTZWFyY2hdIHwgW2dsb2I6IHN0cmluZywgc2VhcmNoPzogU2VhcmNoXSB8IFtdXG4gICk6IFByb21pc2U8QWJzb2x1dGVQYXRocz4ge1xuICAgIGxldCBnbG9iOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IHNlYXJjaDogU2VhcmNoIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKGFyZ3MubGVuZ3RoICE9PSAwKSB7XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgW2dsb2IsIHNlYXJjaF0gPSBhcmdzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgW3NlYXJjaF0gPSBhcmdzO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLiNraW5kID09PSBcInJlZ3VsYXJcIikge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIGBZb3UgY2Fubm90IGV4ZWN1dGUgYSBnbG9iIGluc2lkZSBhIHJlZ3VsYXIgZmlsZSAoZmlsZT0ke1xuICAgICAgICAgIHRoaXMuI2ZpbGVuYW1lXG4gICAgICAgIH0sIGdsb2I9JHtnbG9ifSwgc2VhcmNoPSR7c2VhcmNoPy5raW5kID8/IFwicmVndWxhclwifSlgXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBBYnNvbHV0ZVBhdGhzLmdsb2IoZ2xvYiA/PyBcIioqXCIsIHRoaXMsIHNlYXJjaCk7XG4gIH1cblxuICBmaWxlKC4uLnJlbGF0aXZlUGF0aDogcmVhZG9ubHkgc3RyaW5nW10pOiBBYnNvbHV0ZVBhdGgge1xuICAgIGlmICh0aGlzLiNraW5kID09PSBcInJlZ3VsYXJcIikge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIGBDYW5ub3QgY3JlYXRlIGEgbmVzdGVkIGZpbGUgaW5zaWRlIGEgcmVndWxhciBmaWxlIChwYXJlbnQ9JHtcbiAgICAgICAgICB0aGlzLiNmaWxlbmFtZVxuICAgICAgICB9LCBjaGlsZD0ke3BhdGguam9pbiguLi5yZWxhdGl2ZVBhdGgpfSlgXG4gICAgICApO1xuICAgIH1cblxuICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKGBbRklMRV1gLCB7XG4gICAgICByZXNvbHZlZDogcGF0aC5yZXNvbHZlKHRoaXMuI2ZpbGVuYW1lLCAuLi5yZWxhdGl2ZVBhdGgpLFxuICAgICAgcGF0aDogQWJzb2x1dGVQYXRoLmZpbGUocGF0aC5yZXNvbHZlKHRoaXMuI2ZpbGVuYW1lLCAuLi5yZWxhdGl2ZVBhdGgpKSxcbiAgICB9KTtcblxuICAgIHJldHVybiBBYnNvbHV0ZVBhdGguZmlsZShwYXRoLnJlc29sdmUodGhpcy4jZmlsZW5hbWUsIC4uLnJlbGF0aXZlUGF0aCkpO1xuICB9XG5cbiAgZGlyZWN0b3J5KC4uLnJlbGF0aXZlUGF0aDogcmVhZG9ubHkgc3RyaW5nW10pOiBBYnNvbHV0ZVBhdGgge1xuICAgIGlmICh0aGlzLiNraW5kID09PSBcInJlZ3VsYXJcIikge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIGBDYW5ub3QgY3JlYXRlIGEgbmVzdGVkIGRpcmVjdG9yeSBpbnNpZGUgYSByZWd1bGFyIGZpbGUgKHBhcmVudD0ke1xuICAgICAgICAgIHRoaXMuI2ZpbGVuYW1lXG4gICAgICAgIH0sIGNoaWxkPSR7cGF0aC5qb2luKC4uLnJlbGF0aXZlUGF0aCl9KWBcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIEFic29sdXRlUGF0aC5kaXJlY3RvcnkoXG4gICAgICBwYXRoLnJlc29sdmUodGhpcy4jZmlsZW5hbWUsIC4uLnJlbGF0aXZlUGF0aClcbiAgICApO1xuICB9XG5cbiAgcmVsYXRpdmVGcm9tQW5jZXN0b3IoYW5jZXN0b3I6IEFic29sdXRlUGF0aCkge1xuICAgIGlmICghYW5jZXN0b3IuY29udGFpbnModGhpcykpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBgQ2Fubm90IGNvbXB1dGUgYSByZWxhdGl2ZSBwYXRoIGZyb20gJHthbmNlc3Rvci4jZmlsZW5hbWV9IHRvICR7XG4gICAgICAgICAgdGhpcy4jZmlsZW5hbWVcbiAgICAgICAgfSwgYmVjYXVzZSBpdCBpcyBub3QgYW4gYW5jZXN0b3JgXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBwYXRoLnJlbGF0aXZlKGFuY2VzdG9yLiNmaWxlbmFtZSwgdGhpcy4jZmlsZW5hbWUpO1xuICB9XG5cbiAgY29udGFpbnMobWF5YmVDaGlsZDogQWJzb2x1dGVQYXRoKTogYm9vbGVhbiB7XG4gICAgbGV0IHJlbGF0aXZlID0gcGF0aC5yZWxhdGl2ZSh0aGlzLiNmaWxlbmFtZSwgbWF5YmVDaGlsZC4jZmlsZW5hbWUpO1xuXG4gICAgcmV0dXJuICFyZWxhdGl2ZS5zdGFydHNXaXRoKFwiLlwiKTtcbiAgfVxuXG4gIGVxKG90aGVyOiBBYnNvbHV0ZVBhdGgpIHtcbiAgICByZXR1cm4gdGhpcy4jZmlsZW5hbWUgPT09IG90aGVyLiNmaWxlbmFtZTtcbiAgfVxuXG4gIFtJTlNQRUNUXShjb250ZXh0OiBudWxsLCB7IHN0eWxpemUgfTogdXRpbC5JbnNwZWN0T3B0aW9uc1N0eWxpemVkKSB7XG4gICAgcmV0dXJuIGAke3N0eWxpemUoXCJQYXRoXCIsIFwic3BlY2lhbFwiKX0oJHtzdHlsaXplKFxuICAgICAgdGhpcy4jZmlsZW5hbWUsXG4gICAgICBcIm1vZHVsZVwiXG4gICAgKX0pYDtcbiAgfVxufVxuXG5jbGFzcyBQcmVwYXJlVHJhbnNwaWxhdGlvbiB7XG4gIHN0YXRpYyBjcmVhdGUobmFtZTogc3RyaW5nLCBkaWZmOiBQYXRoRGlmZkJ5S2luZCk6IFByZXBhcmVUcmFuc3BpbGF0aW9uIHtcbiAgICByZXR1cm4gbmV3IFByZXBhcmVUcmFuc3BpbGF0aW9uKG5hbWUsIGRpZmYpO1xuICB9XG5cbiAgcmVhZG9ubHkgI25hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgI2RpZmY6IFBhdGhEaWZmQnlLaW5kO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IobmFtZTogc3RyaW5nLCBkaWZmOiBQYXRoRGlmZkJ5S2luZCkge1xuICAgIHRoaXMuI25hbWUgPSBuYW1lO1xuICAgIHRoaXMuI2RpZmYgPSBkaWZmO1xuICB9XG5cbiAgYXN5bmMgcnVuKHsgZHJ5UnVuIH06IHsgZHJ5UnVuOiBib29sZWFuIH0gPSB7IGRyeVJ1bjogZmFsc2UgfSkge1xuICAgIGxldCB7IGRpcmVjdG9yaWVzLCBmaWxlcyB9ID0gdGhpcy4jZGlmZjtcblxuICAgIGlmIChkcnlSdW4pIHtcbiAgICAgIGxvZ1xuICAgICAgICAubmV3bGluZSgpXG4gICAgICAgIC5sb2coXCJbRFJZLVJVTl1cIiwgdGhpcy4jbmFtZSlcbiAgICAgICAgLm5ld2xpbmUoKVxuICAgICAgICAuaGVhZGluZyhcIltEUlktUlVOXVwiLCBcIkRpcmVjdG9yaWVzXCIpO1xuXG4gICAgICBmb3IgKGxldCByZW1vdmVkIG9mIGRpcmVjdG9yaWVzLnJlbW92ZWQpIHtcbiAgICAgICAgbG9nLnNpbGVudC5pbnNwZWN0LmxhYmVsZWQoXCIgIFstLV1cIiwgcmVtb3ZlZCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAobGV0IGFkZGVkIG9mIGRpcmVjdG9yaWVzLmFkZGVkKSB7XG4gICAgICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKFwiICBbKytdXCIsIGFkZGVkKTtcbiAgICAgIH1cblxuICAgICAgbG9nLnNpbGVudC5uZXdsaW5lKCkuaGVhZGluZyhcIltEUlktUlVOXVwiLCBcIkZpbGVzXCIpO1xuXG4gICAgICBmb3IgKGxldCByZW1vdmVkIG9mIGZpbGVzLnJlbW92ZWQpIHtcbiAgICAgICAgbG9nLnNpbGVudC5pbnNwZWN0LmxhYmVsZWQoXCIgIFstLV1cIiwgcmVtb3ZlZCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAobGV0IGFkZGVkIG9mIGZpbGVzLmFkZGVkKSB7XG4gICAgICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKFwiICBbKytdXCIsIGFkZGVkKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChsZXQgcmVtb3ZlZCBvZiBkaXJlY3Rvcmllcy5yZW1vdmVkKSB7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIFRyYW5zcGlsZVRhc2sge1xuICBzdGF0aWMgY3JlYXRlKGlucHV0OiBBYnNvbHV0ZVBhdGgsIG91dHB1dDogQWJzb2x1dGVQYXRoKTogVHJhbnNwaWxlVGFzayB7XG4gICAgcmV0dXJuIG5ldyBUcmFuc3BpbGVUYXNrKGlucHV0LCBvdXRwdXQpO1xuICB9XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICByZWFkb25seSBpbnB1dDogQWJzb2x1dGVQYXRoLFxuICAgIHJlYWRvbmx5IG91dHB1dDogQWJzb2x1dGVQYXRoXG4gICkge31cbn1cblxuYXN5bmMgZnVuY3Rpb24gd29ya3NwYWNlUGFja2FnZXMocm9vdDogc3RyaW5nLCBmaWx0ZXI6IHN0cmluZykge1xuICBsZXQgc3Rkb3V0ID0gYXdhaXQgZXhlYyhcbiAgICBzaGBwbnBtIG0gbHMgLS1maWx0ZXIgLi8ke2ZpbHRlcn0gLS1kZXB0aCAtMSAtLXBvcmNlbGFpbmBcbiAgKTtcblxuICBpZiAoc3Rkb3V0ID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gW107XG4gIH1cblxuICByZXR1cm4gc3Rkb3V0XG4gICAgLnNwbGl0KFwiXFxuXCIpXG4gICAgLmZpbHRlcigoZmlsZSkgPT4gZmlsZSAhPT0gXCJcIiAmJiBmaWxlICE9PSByb290KVxuICAgIC5tYXAoKHApID0+IHBhdGgucmVsYXRpdmUocm9vdCwgcCkpO1xufVxuXG5pbnRlcmZhY2UgRXhlY0Vycm9yT3B0aW9ucyBleHRlbmRzIEVycm9yT3B0aW9ucyB7XG4gIGNvZGU6IG51bWJlciB8IG51bGw7XG4gIGNvbW1hbmQ6IHN0cmluZztcbn1cblxuY2xhc3MgRXhlY0Vycm9yIGV4dGVuZHMgRXJyb3Ige1xuICByZWFkb25seSAjY29kZTogbnVtYmVyIHwgbnVsbDtcbiAgcmVhZG9ubHkgI2NvbW1hbmQ6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIG9wdGlvbnM6IEV4ZWNFcnJvck9wdGlvbnMpIHtcbiAgICBzdXBlcihtZXNzYWdlLCBvcHRpb25zKTtcblxuICAgIHRoaXMuI2NvZGUgPSBvcHRpb25zLmNvZGU7XG4gICAgdGhpcy4jY29tbWFuZCA9IG9wdGlvbnMuY29tbWFuZDtcblxuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpO1xuICB9XG5cbiAgZ2V0IGNvZGUoKTogbnVtYmVyIHwgXCJ1bmtub3duXCIge1xuICAgIHJldHVybiB0aGlzLiNjb2RlID8/IFwidW5rbm93blwiO1xuICB9XG5cbiAgZ2V0IG1lc3NhZ2UoKTogc3RyaW5nIHtcbiAgICBsZXQgbWVzc2FnZSA9IHN1cGVyLm1lc3NhZ2U7XG4gICAgbGV0IGhlYWRlciA9IGBFeGVjIEZhaWxlZCB3aXRoIGNvZGU9JHt0aGlzLmNvZGV9XFxuICAoaW4gJHt0aGlzLiNjb21tYW5kfSlgO1xuXG4gICAgaWYgKG1lc3NhZ2UpIHtcbiAgICAgIHJldHVybiBgJHtoZWFkZXJ9XFxuXFxuJHttZXNzYWdlfWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBoZWFkZXI7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGV4ZWMoY29tbWFuZDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmcgfCB1bmRlZmluZWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChmdWxmaWxsLCByZWplY3QpID0+IHtcbiAgICBsZXQgY2hpbGQgPSBzaGVsbC5leGVjKGNvbW1hbmQsIHsgc2lsZW50OiB0cnVlLCBhc3luYzogdHJ1ZSB9KTtcblxuICAgIGxldCBzdGRvdXQgPSByZWFkQWxsKGNoaWxkLnN0ZG91dCk7XG4gICAgbGV0IHN0ZGVyciA9IHJlYWRBbGwoY2hpbGQuc3RkZXJyKTtcblxuICAgIGNoaWxkLm9uKFwiZXJyb3JcIiwgKGVycikgPT4gcmVqZWN0KGVycikpO1xuICAgIGNoaWxkLm9uKFwiZXhpdFwiLCBhc3luYyAoY29kZSkgPT4ge1xuICAgICAgbG9nKFwiZXhlYyBzdGF0dXNcIiwgeyBjb2RlLCBzdGRvdXQ6IGF3YWl0IHN0ZG91dCB9KTtcblxuICAgICAgaWYgKGNvZGUgPT09IDApIHtcbiAgICAgICAgZnVsZmlsbChhd2FpdCBzdGRvdXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nKFwiZXhlYyBlcnJvclwiLCB7XG4gICAgICAgICAgZXJyb3I6IGF3YWl0IHN0ZGVycixcbiAgICAgICAgICBvdXQ6IGF3YWl0IHN0ZG91dCxcbiAgICAgICAgICBjb2RlLFxuICAgICAgICAgIGNvbW1hbmQsXG4gICAgICAgIH0pO1xuICAgICAgICByZWplY3QobmV3IEV4ZWNFcnJvcigoYXdhaXQgc3RkZXJyKSA/PyBcIlwiLCB7IGNvZGUsIGNvbW1hbmQgfSkpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn1cblxuaW50ZXJmYWNlIFJlYWRhYmxlU3RyZWFtIGV4dGVuZHMgTm9kZUpTLlJlYWRhYmxlU3RyZWFtIHtcbiAgY2xvc2VkPzogYm9vbGVhbjtcbiAgZGVzdHJveWVkPzogYm9vbGVhbjtcbiAgZGVzdHJveT8oKTogdm9pZDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVhZEFsbChcbiAgcmVhZGFibGU/OiBSZWFkYWJsZVN0cmVhbSB8IG51bGxcbik6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPiB7XG4gIGlmIChyZWFkYWJsZSA9PT0gdW5kZWZpbmVkIHx8IHJlYWRhYmxlID09PSBudWxsKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IHJlc3VsdCA9IGF3YWl0IG5ldyBQcm9taXNlUmVhZGFibGUocmVhZGFibGUpLnJlYWRBbGwoKTtcblxuICBpZiAocmVzdWx0ID09PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9IGVsc2UgaWYgKHR5cGVvZiByZXN1bHQgPT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiByZXN1bHQudG9TdHJpbmcoXCJ1dGYtOFwiKTtcbiAgfVxufVxuXG5jb25zdCBQQVJUU19NQVRDSEVSID0gL14oPzxmaWxlPlteLl0qKSg/OlsuXSg/PGV4dD4uKikpPyQvO1xuXG5pbnRlcmZhY2UgRmlsZVBhcnRzIHtcbiAgcmVhZG9ubHkgcGFyZW50OiBzdHJpbmcgfCBudWxsO1xuICByZWFkb25seSBiYXNlbmFtZToge1xuICAgIHJlYWRvbmx5IGZpbGU6IHN0cmluZztcbiAgICByZWFkb25seSBleHQ6IHN0cmluZyB8IG51bGw7XG4gIH07XG4gIHJlYWRvbmx5IGtpbmQ/OiBBYnNvbHV0ZVBhdGhLaW5kO1xufVxuXG5mdW5jdGlvbiBnZXRQYXJ0cyhmaWxlbmFtZTogc3RyaW5nKTogRmlsZVBhcnRzIHtcbiAgbGV0IHBhcmVudCA9IGdldFBhcmVudChmaWxlbmFtZSk7XG4gIGxldCBiYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZW5hbWUpO1xuXG4gIGxldCBleHRlbnNpb24gPSBiYXNlbmFtZS5tYXRjaChQQVJUU19NQVRDSEVSKTtcblxuICBpZiAoZXh0ZW5zaW9uID09PSBudWxsKSB7XG4gICAgcmV0dXJuIHsgcGFyZW50LCBiYXNlbmFtZTogeyBmaWxlOiBiYXNlbmFtZSwgZXh0OiBudWxsIH0gfTtcbiAgfVxuXG4gIGxldCB7IGZpbGUsIGV4dCB9ID0gZXh0ZW5zaW9uLmdyb3VwcyE7XG5cbiAgcmV0dXJuIHtcbiAgICBwYXJlbnQsXG4gICAgYmFzZW5hbWU6IHsgZmlsZSwgZXh0IH0sXG4gICAga2luZDogcGFyZW50ID09PSBudWxsID8gXCJyb290XCIgOiB1bmRlZmluZWQsXG4gIH07XG5cbiAgLy8gbGV0IFssIGJhc2VuYW1lLCBleHRuYW1lXTtcbn1cblxuZnVuY3Rpb24gZ2V0UGFyZW50KGZpbGVuYW1lOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgbGV0IHBhcmVudCA9IHBhdGguZGlybmFtZShmaWxlbmFtZSk7XG4gIGxldCByb290ID0gcGF0aC5wYXJzZShwYXJlbnQpLnJvb3Q7XG5cbiAgaWYgKGZpbGVuYW1lID09PSByb290KSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHBhcmVudDtcbiAgfVxufVxuXG5mdW5jdGlvbiBjaGFuZ2VFeHRlbnNpb24oZmlsZTogc3RyaW5nLCB0bzogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgYmFzZW5hbWUgPSBwYXRoLmJhc2VuYW1lKGZpbGUsIHBhdGguZXh0bmFtZShmaWxlKSk7XG4gIHJldHVybiBwYXRoLmpvaW4ocGF0aC5kaXJuYW1lKGZpbGUpLCBgJHtiYXNlbmFtZX0uJHt0b31gKTtcbn1cblxuZnVuY3Rpb24gZXhoYXVzdGl2ZSh2YWx1ZTogbmV2ZXIsIGRlc2NyaXB0aW9uOiBzdHJpbmcpOiBuZXZlciB7XG4gIHRocm93IEVycm9yKGBFeHBlY3RlZCAke2Rlc2NyaXB0aW9ufSB0byBiZSBleGhhdXN0aXZlbHkgY2hlY2tlZGApO1xufVxuXG5jb25zdCBMQUJFTCA9IFN5bWJvbChcIkxBQkVMXCIpO1xudHlwZSBMQUJFTCA9IHR5cGVvZiBMQUJFTDtcblxuaW50ZXJmYWNlIExhYmVsIHtcbiAgcmVhZG9ubHkgW0xBQkVMXTogcmVhZG9ubHkgc3RyaW5nW107XG59XG5cbmZ1bmN0aW9uIExhYmVsKC4uLmxhYmVsOiBzdHJpbmdbXSk6IExhYmVsIHtcbiAgcmV0dXJuIHsgW0xBQkVMXTogbGFiZWwgfTtcbn1cblxuZnVuY3Rpb24gaXNMYWJlbCh2YWx1ZTogdW5rbm93bik6IHZhbHVlIGlzIExhYmVsIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIiAmJiB2YWx1ZSAhPT0gbnVsbCAmJiBMQUJFTCBpbiB2YWx1ZTtcbn1cblxuaW50ZXJmYWNlIExvZyB7XG4gICh2YWx1ZTogdW5rbm93bik6IExvZztcbiAgKGxhYmVsOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKTogTG9nO1xuICAobGFiZWw6IHVua25vd24pOiBMb2c7XG5cbiAgcmVhZG9ubHkgbG9nOiBMb2c7XG4gIHJlYWRvbmx5IHNpbGVudDogTG9nO1xuXG4gIG5ld2xpbmUoKTogTG9nO1xuICBoZWFkaW5nKC4uLmxhYmVsOiBzdHJpbmdbXSk6IExvZztcblxuICByZWFkb25seSBpbnNwZWN0OiB7XG4gICAgKHZhbHVlOiB1bmtub3duLCBvcHRpb25zPzogdXRpbC5JbnNwZWN0T3B0aW9ucyk6IExvZztcbiAgICBsYWJlbGVkKFxuICAgICAgbGFiZWw6IHN0cmluZyB8IExhYmVsLFxuICAgICAgdmFsdWU6IHVua25vd24sXG4gICAgICBvcHRpb25zPzogdXRpbC5JbnNwZWN0T3B0aW9uc1xuICAgICk6IExvZztcbiAgfTtcbn1cblxuY29uc3QgU0lMRU5UOiBMb2cgPSAoKCkgPT4ge1xuICBjb25zdCBsb2cgPSAoLi4uYXJnczogdW5rbm93bltdKTogTG9nID0+IFNJTEVOVDtcbiAgbG9nLmxvZyA9IGxvZztcbiAgbG9nLnNpbGVudCA9IGxvZztcblxuICBsb2cubmV3bGluZSA9ICgpID0+IGxvZztcbiAgbG9nLmhlYWRpbmcgPSAoLi4ubGFiZWw6IHN0cmluZ1tdKSA9PiBsb2c7XG5cbiAgY29uc3QgaW5zcGVjdCA9ICh2YWx1ZTogdW5rbm93biwgb3B0aW9ucz86IHV0aWwuSW5zcGVjdE9wdGlvbnMpID0+IGxvZztcbiAgaW5zcGVjdC5sYWJlbGVkID0gKC4uLmFyZ3M6IHVua25vd25bXSk6IExvZyA9PiBsb2c7XG4gIGxvZy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuICByZXR1cm4gbG9nO1xufSkoKTtcblxuZnVuY3Rpb24gbG9nKHZhbHVlOiB1bmtub3duKTogTG9nO1xuZnVuY3Rpb24gbG9nKGxhYmVsOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKTogTG9nO1xuZnVuY3Rpb24gbG9nKGxhYmVsOiB1bmtub3duKTogTG9nO1xuZnVuY3Rpb24gbG9nKFxuICAuLi5hcmdzOiBbdmFsdWU6IHVua25vd25dIHwgW2xhYmVsOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duXSB8IFtMYWJlbF1cbik6IExvZyB7XG4gIGlmIChhcmdzLmxlbmd0aCA9PT0gMikge1xuICAgIGxldCBbbGFiZWwsIHZhbHVlXSA9IGFyZ3M7XG4gICAgY29uc29sZS5sb2cobGFiZWwsIHV0aWwuaW5zcGVjdCh2YWx1ZSwgeyBkZXB0aDogbnVsbCwgY29sb3JzOiB0cnVlIH0pKTtcbiAgfSBlbHNlIHtcbiAgICBsZXQgW3ZhbHVlXSA9IGFyZ3M7XG5cbiAgICBpZiAoaXNMYWJlbCh2YWx1ZSkpIHtcbiAgICAgIGNvbnNvbGUubG9nKC4uLnZhbHVlW0xBQkVMXSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKHV0aWwuaW5zcGVjdCh2YWx1ZSwgeyBkZXB0aDogbnVsbCwgY29sb3JzOiB0cnVlIH0pKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbG9nO1xufVxuXG5sb2cuc2lsZW50ID0gbG9nO1xubG9nLmxvZyA9IGxvZztcblxubG9nLm5ld2xpbmUgPSAoKTogdHlwZW9mIGxvZyA9PiB7XG4gIGNvbnNvbGUubG9nKFwiXFxuXCIpO1xuICByZXR1cm4gbG9nO1xufTtcblxubG9nLmhlYWRpbmcgPSAoLi4ubGFiZWw6IHN0cmluZ1tdKTogdHlwZW9mIGxvZyA9PiB7XG4gIGNvbnNvbGUubG9nKC4uLmxhYmVsKTtcbiAgcmV0dXJuIGxvZztcbn07XG5cbmNvbnN0IGxvZ0xhYmVsZWQgPSAoXG4gIGxhYmVsOiBzdHJpbmcgfCBMYWJlbCxcbiAgdmFsdWU6IHVua25vd24sXG4gIG9wdGlvbnM/OiB1dGlsLkluc3BlY3RPcHRpb25zXG4pOiB0eXBlb2YgbG9nID0+IHtcbiAgbG9nTGFiZWxlZFZhbHVlKGxhYmVsLCB2YWx1ZSwgb3B0aW9ucyk7XG4gIHJldHVybiBsb2c7XG59O1xuXG5jb25zdCBsb2dJbnNwZWN0ID0gKFxuICB2YWx1ZTogdW5rbm93bixcbiAgb3B0aW9ucz86IHV0aWwuSW5zcGVjdE9wdGlvbnNcbik6IHR5cGVvZiBsb2cgPT4ge1xuICBjb25zb2xlLmxvZyhpbnNwZWN0KHZhbHVlLCBvcHRpb25zKSk7XG4gIHJldHVybiBsb2c7XG59O1xuXG5sb2dJbnNwZWN0LmxhYmVsZWQgPSBsb2dMYWJlbGVkO1xuXG5sb2cuaW5zcGVjdCA9IGxvZ0luc3BlY3Q7XG5cbmZ1bmN0aW9uIGxvZ0xhYmVsZWRWYWx1ZShcbiAgbGFiZWw6IHN0cmluZyB8IExhYmVsLFxuICB2YWx1ZTogdW5rbm93bixcbiAgb3B0aW9uczogdXRpbC5JbnNwZWN0T3B0aW9ucyA9IHt9XG4pOiB2b2lkIHtcbiAgaWYgKGlzTGFiZWwobGFiZWwpKSB7XG4gICAgY29uc29sZS5sb2coLi4ubGFiZWxbTEFCRUxdLCBpbnNwZWN0KHZhbHVlLCBvcHRpb25zKSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5sb2cobGFiZWwsIGluc3BlY3QodmFsdWUsIG9wdGlvbnMpKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbnNwZWN0KHZhbHVlOiB1bmtub3duLCBvcHRpb25zOiB1dGlsLkluc3BlY3RPcHRpb25zID0ge30pOiBzdHJpbmcge1xuICByZXR1cm4gdXRpbC5pbnNwZWN0KHZhbHVlLCB7IC4uLm9wdGlvbnMsIGRlcHRoOiBudWxsLCBjb2xvcnM6IHRydWUgfSk7XG59XG5cbmZ1bmN0aW9uIGxvZ2dlZDxUPih2YWx1ZTogVCwgZGVzY3JpcHRpb246IHN0cmluZywgc2hvdWxkTG9nID0gdHJ1ZSk6IFQge1xuICBpZiAoc2hvdWxkTG9nKSB7XG4gICAgY29uc29sZS5sb2coXG4gICAgICBkZXNjcmlwdGlvbixcbiAgICAgIFwiPVwiLFxuICAgICAgdXRpbC5pbnNwZWN0KHZhbHVlLCB7IGRlcHRoOiBudWxsLCBjb2xvcnM6IHRydWUgfSlcbiAgICApO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cbiJdfQ==