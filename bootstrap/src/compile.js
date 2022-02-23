import swc from "@swc/core";
import { createHash } from "crypto";
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
        let transpilation = await this.#packageTranspilation();
        let prepare = transpilation.prepare(await this.#getDistFiles());
        prepare.run({ dryRun });
        transpilation.transpile({ dryRun });
    }
    get #dist() {
        return this.root.directory("dist");
    }
    get #files() {
        return AbsolutePaths.glob([`!(node_modules|dist)**/*.ts`, `index.ts`], this.root);
    }
    async #packageTranspilation() {
        let files = await this.#files;
        let dts = files.filter((file) => file.hasExactExtension("d.ts"));
        for (let file of dts) {
            console.warn(`Unexpected .d.ts file found during compilation (${file})`);
        }
        let ts = files.filter((file) => file.hasExactExtension("ts"));
        log.silent.inspect.labeled(`[TS-FILES]`, ts);
        return Transpilation.create(this.name, this.#dist, ts.mapArray((file) => this.#fileTranspilation(file)));
    }
    async #getDistFiles() {
        return this.#dist.glob("**", { kind: "all" });
    }
    #fileTranspilation(inputPath) {
        let relativePath = inputPath.relativeFromAncestor(this.root);
        let output = this.#dist.file(relativePath).changeExtension("js");
        let digest = output.changeExtension("digest");
        log.silent.inspect.labeled(`[TRANSPILE]`, {
            input: inputPath,
            root: this.root,
            relative: relativePath,
            output,
            digest,
        });
        return TranspileTask.create(inputPath, output, digest);
    }
}
class Transpilation {
    static create(name, dist, tasks) {
        return new Transpilation(name, dist, tasks);
    }
    #name;
    #dist;
    #tasks;
    constructor(name, dist, tasks) {
        this.#name = name;
        this.#dist = dist;
        this.#tasks = tasks;
    }
    prepare(existing) {
        // console.log({ existing, outputPaths: this.outputPaths });
        let digests = existing.filter((file) => file.hasExactExtension("digest"));
        let nonDigests = existing.filter((file) => !file.hasExactExtension("digest"));
        return PrepareTranspilation.create(this.#name, nonDigests.diffByKind(this.outputPaths), digests.diff(this.digests));
    }
    async transpile({ dryRun } = { dryRun: false }) {
        for (let task of this.#tasks) {
            log.silent.heading(`[TRANSPILING]`, this.#name);
            if (!dryRun) {
                task.transpile();
            }
        }
    }
    get outputFiles() {
        return AbsolutePaths.from(this.#tasks.map((task) => task.output));
    }
    get digests() {
        return this.outputFiles.map((file) => file.changeExtension("digest"));
    }
    get outputPaths() {
        let files = this.outputFiles;
        log.silent.inspect.labeled("[OUT-FILES]", files);
        let directories = files.directory.without(this.#dist);
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
    static from(paths) {
        if (paths instanceof AbsolutePaths) {
            return paths;
        }
        else {
            let newPaths = AbsolutePaths.empty();
            newPaths.add(paths);
            return newPaths;
        }
    }
    static async all(inside, options = { kind: "regular" }) {
        return AbsolutePaths.glob("**", inside, options);
    }
    static async glob(glob, inside, { kind } = {
        kind: "regular",
    }) {
        let globs = typeof glob === "string" ? [glob] : glob;
        let fullGlob = globs.map((glob) => path.resolve(AbsolutePath.getFilename(inside), glob));
        return AbsolutePaths.#glob(fullGlob, kind);
    }
    static async #glob(globs, kind) {
        switch (kind) {
            case "directory": {
                return AbsolutePaths.marked(await searchGlob(globs, {
                    markDirectories: true,
                    onlyDirectories: true,
                }));
            }
            case "regular": {
                return AbsolutePaths.marked(await searchGlob(globs, {
                    onlyFiles: true,
                }));
            }
            case "all": {
                return AbsolutePaths.marked(await searchGlob(globs, {
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
    without(paths) {
        let remove = AbsolutePaths.from(paths);
        let filtered = new Map([...this.#paths].filter(([, path]) => !remove.has(path)));
        return new AbsolutePaths(filtered);
    }
    /**
     * Returns true if any of the files in this set are directories that contain this path
     */
    contains(maybeChild) {
        return !!this.find((path) => path.contains(maybeChild));
    }
    diff(other) {
        let { added, removed } = diffFiles(this, other);
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
        // console.log({ current: this.directories, next: other.directories });
        let directories = this.directories.diff(other.directories);
        log.silent
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
            // console.log({ path, rest });
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
function diffFiles(prev, next) {
    let added = AbsolutePaths.empty();
    let removed = AbsolutePaths.empty();
    for (let path of next) {
        if (!prev.has(path)) {
            added.add(path);
        }
    }
    for (let path of prev) {
        if (!next.has(path)) {
            removed.add(path);
        }
    }
    return { added, removed };
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
            return AbsolutePath.#checked(path.slice(0, -1), "directory", ".marked");
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
    async read() {
        if (this.#kind !== "regular") {
            throw Error(`You can only read from a regular file (file=${this.#filename})`);
        }
        try {
            return await fs.readFile(this.#filename, { encoding: "utf-8" });
        }
        catch (e) {
            return null;
        }
    }
    async digest() {
        let contents = await this.read();
        return contents === null ? null : digest(contents);
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
    static create(name, diff, digests) {
        return new PrepareTranspilation(name, diff, digests);
    }
    #name;
    #diff;
    #digests;
    constructor(name, diff, digests) {
        this.#name = name;
        this.#diff = diff;
        this.#digests = digests;
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
                log.inspect.labeled("  [--]", removed);
            }
            for (let added of directories.added) {
                log.silent.inspect.labeled("  [++]", added);
            }
            log.newline().heading("[DRY-RUN]", "Files");
            for (let removed of files.removed) {
                log.inspect.labeled("  [--]", removed);
            }
            for (let added of files.added) {
                log.silent.inspect.labeled("  [++]", added);
            }
        }
        else {
            for (let removed of directories.removed) {
                log.inspect.labeled("[--]", removed);
                shell.rm("-r", AbsolutePath.getFilename(removed));
            }
            for (let directory of directories.added) {
                log.inspect.labeled("[++]", directory);
                shell.mkdir("-p", AbsolutePath.getFilename(directory));
            }
            for (let removed of files.removed) {
                log.inspect.labeled("  [--]", removed);
                shell.rm(AbsolutePath.getFilename(removed));
            }
            for (let removed of this.#digests.removed) {
                log.inspect.labeled("  [--]", removed);
                shell.rm(AbsolutePath.getFilename(removed));
            }
        }
    }
}
class TranspileTask {
    input;
    output;
    static create(input, output, digest) {
        return new TranspileTask(input, output, digest);
    }
    #digest;
    constructor(input, output, digest) {
        this.input = input;
        this.output = output;
        this.#digest = digest;
    }
    async #digests() {
        let prev = await this.#digest.read();
        let input = await this.input.read();
        if (input === null) {
            throw Error(`Unable to read ${AbsolutePath.getFilename(this.input)}`);
        }
        let next = digest(input);
        return { prev, next };
        // let next
    }
    async transpile() {
        log.silent.inspect.labeled("[TRANSPILE-TASK]", {
            input: this.input,
            output: this.output,
            digest: this.#digest,
        });
        let digests = await this.#digests();
        if (digests.prev === digests.next) {
            log.silent.inspect.labeled("[FRESH]", this.input);
            return;
        }
        else {
            log.inspect.labeled("[STALE]", this.input);
        }
        let output = swc.transformFileSync(AbsolutePath.getFilename(this.input), {
            sourceMaps: "inline",
            inlineSourcesContent: true,
            jsc: {
                parser: {
                    syntax: "typescript",
                    decorators: true,
                },
                target: "es2022",
            },
            outputPath: AbsolutePath.getFilename(this.output),
        });
        log.silent.inspect.labeled("[WRITING]", {
            file: this.output,
            code: output.code,
        });
        await fs.writeFile(AbsolutePath.getFilename(this.#digest), digests.next, {
            encoding: "utf-8",
        });
        await fs.writeFile(AbsolutePath.getFilename(this.output), output.code);
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
            log.silent("exec status", { code, stdout: await stdout });
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
log.silent = SILENT;
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
function digest(source) {
    let hash = createHash("sha256");
    hash.update(source);
    return hash.digest("hex");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbXBpbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxHQUFHLE1BQU0sV0FBVyxDQUFDO0FBQzVCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDcEMsT0FBTyxVQUFVLE1BQU0sV0FBVyxDQUFDO0FBQ25DLE9BQU8sS0FBSyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ2xDLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxNQUFNLENBQUM7QUFDbEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ25ELE9BQU8sRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ2xDLE9BQU8sS0FBSyxNQUFNLFNBQVMsQ0FBQztBQUM1QixPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUU3QixNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBRWhFLE1BQU0sT0FBTyxTQUFTO0lBQ3BCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBWSxFQUFFLFNBQWlCO1FBQ2pELElBQUksS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRXJELElBQUksUUFBUSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDOUIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDOUIsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDekQsSUFBSSxHQUFHLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxN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LENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgc3djIGZyb20gXCJAc3djL2NvcmVcIjtcbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tIFwiY3J5cHRvXCI7XG5pbXBvcnQgc2VhcmNoR2xvYiBmcm9tIFwiZmFzdC1nbG9iXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnMvcHJvbWlzZXNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IGlzQWJzb2x1dGUgfSBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgUHJvbWlzZVJlYWRhYmxlIH0gZnJvbSBcInByb21pc2UtcmVhZGFibGVcIjtcbmltcG9ydCBzaCBmcm9tIFwic2hlbGwtZXNjYXBlLXRhZ1wiO1xuaW1wb3J0IHNoZWxsIGZyb20gXCJzaGVsbGpzXCI7XG5pbXBvcnQgKiBhcyB1dGlsIGZyb20gXCJ1dGlsXCI7XG5cbmV4cG9ydCBjb25zdCBJTlNQRUNUID0gU3ltYm9sLmZvcihcIm5vZGVqcy51dGlsLmluc3BlY3QuY3VzdG9tXCIpO1xuXG5leHBvcnQgY2xhc3MgV29ya3NwYWNlIHtcbiAgLyoqXG4gICAqIEBwYXJhbSByb290IHRoZSByb290IG9mIHRoZSB3b3Jrc3BhY2UsIGFzIGFuIGFic29sdXRlIGRpcmVjdG9yeVxuICAgKi9cbiAgc3RhdGljIGFzeW5jIGNyZWF0ZShyb290OiBzdHJpbmcsIG5hbWVzcGFjZTogc3RyaW5nKSB7XG4gICAgbGV0IHBhdGhzID0gYXdhaXQgd29ya3NwYWNlUGFja2FnZXMocm9vdCwgbmFtZXNwYWNlKTtcblxuICAgIGxldCBwYWNrYWdlcyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgcGF0aHMubWFwKGFzeW5jIChwYWNrYWdlUm9vdCkgPT4ge1xuICAgICAgICBsZXQgbWFuaWZlc3QgPSBwYXRoLnJlc29sdmUocGFja2FnZVJvb3QsIFwicGFja2FnZS5qc29uXCIpO1xuICAgICAgICBsZXQgYnVmID0gYXdhaXQgZnMucmVhZEZpbGUobWFuaWZlc3QsIHsgZW5jb2Rpbmc6IFwidXRmOFwiIH0pO1xuICAgICAgICBsZXQganNvbjogSnNvbk9iamVjdCA9IEpTT04ucGFyc2UoYnVmKTtcblxuICAgICAgICBsZXQgcm9vdCA9IHBhdGguZGlybmFtZShtYW5pZmVzdCk7XG4gICAgICAgIGxldCBuYW1lID0gcGF0aC5iYXNlbmFtZShyb290KTtcblxuICAgICAgICByZXR1cm4gUGFja2FnZS5jcmVhdGUoKCkgPT4gd29ya3NwYWNlLCBuYW1lLCBqc29uKTtcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIGNvbnN0IHdvcmtzcGFjZTogV29ya3NwYWNlID0gbmV3IFdvcmtzcGFjZShyb290LCBuYW1lc3BhY2UsIHBhY2thZ2VzKTtcbiAgICByZXR1cm4gd29ya3NwYWNlO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSBucG0gbmFtZXNwYWNlIChlLmcuIHRoZSAjbmFtZXNwYWNlIG9mIGBAc3RhcmJlYW0vY29yZWAgaXMgYEBzdGFyYmVhbWApXG4gICAqL1xuICByZWFkb25seSAjbmFtZXNwYWNlOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBUaGUgcm9vdCBvZiB0aGUgd29ya3NwYWNlLCBhcyBhbiBhYnNvbHV0ZSBkaXJlY3RvcnlcbiAgICovXG4gIHJlYWRvbmx5ICNyb290OiBzdHJpbmc7XG5cbiAgI3BhY2thZ2VzOiByZWFkb25seSBQYWNrYWdlW107XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICByb290OiBzdHJpbmcsXG4gICAgbmFtZXNwYWNlOiBzdHJpbmcsXG4gICAgcGFja2FnZXM6IHJlYWRvbmx5IFBhY2thZ2VbXVxuICApIHtcbiAgICB0aGlzLiNyb290ID0gcm9vdDtcbiAgICB0aGlzLiNuYW1lc3BhY2UgPSBuYW1lc3BhY2U7XG4gICAgdGhpcy4jcGFja2FnZXMgPSBwYWNrYWdlcztcbiAgfVxuXG4gIGdldCByb290KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI3Jvb3Q7XG4gIH1cblxuICBnZXQgcGFja2FnZXMoKTogcmVhZG9ubHkgUGFja2FnZVtdIHtcbiAgICByZXR1cm4gdGhpcy4jcGFja2FnZXM7XG4gIH1cblxuICBnZXQgbmFtZXNwYWNlKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuI25hbWVzcGFjZTtcbiAgfVxufVxuXG50eXBlIEpzb25WYWx1ZSA9IHN0cmluZyB8IG51bWJlciB8IGJvb2xlYW4gfCBudWxsIHwgSnNvbkFycmF5IHwgSnNvbk9iamVjdDtcbnR5cGUgSnNvbkFycmF5ID0gcmVhZG9ubHkgSnNvblZhbHVlW107XG50eXBlIEpzb25PYmplY3QgPSB7IFtQIGluIHN0cmluZ106IEpzb25WYWx1ZSB9O1xuXG5jbGFzcyBQYWNrYWdlIHtcbiAgc3RhdGljIGNyZWF0ZShcbiAgICB3b3Jrc3BhY2U6ICgpID0+IFdvcmtzcGFjZSxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgbWFuaWZlc3Q6IEpzb25PYmplY3RcbiAgKTogUGFja2FnZSB7XG4gICAgcmV0dXJuIG5ldyBQYWNrYWdlKHdvcmtzcGFjZSwgbmFtZSwgbWFuaWZlc3QpO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSB3b3Jrc3BhY2UgdGhhdCB0aGlzIHBhY2thZ2UgYmVsb25ncyB0by4gSXQncyBhIHRodW5rIGJlY2F1c2Ugd29ya3NwYWNlc1xuICAgKiBhbmQgcGFja2FnZXMgYXJlIGN5Y2xpYyBhbmQgaGF2ZSB0byBiZSBpbml0aWFsaXplZCB0b2dldGhlci5cbiAgICovXG4gIHJlYWRvbmx5ICN3b3Jrc3BhY2VUaHVuazogKCkgPT4gV29ya3NwYWNlO1xuXG4gIC8qKlxuICAgKiBUaGUgbmFtZSBvZiB0aGUgcGFja2FnZS4gRm9yIGV4YW1wbGUsIGAjbmFtZWAgb2YgYEBzdGFyYmVhbS9jb3JlYCBpcyBgY29yZWBcbiAgICovXG4gIHJlYWRvbmx5ICNsb2NhbE5hbWU6IHN0cmluZztcblxuICAvKipcbiAgICogVGhlIHBhcnNlZCBwYWNrYWdlLmpzb25cbiAgICovXG4gIHJlYWRvbmx5ICNtYW5pZmVzdDogSnNvbk9iamVjdDtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgIHdvcmtzcGFjZTogKCkgPT4gV29ya3NwYWNlLFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBtYW5pZmVzdDogSnNvbk9iamVjdFxuICApIHtcbiAgICB0aGlzLiN3b3Jrc3BhY2VUaHVuayA9IHdvcmtzcGFjZTtcbiAgICB0aGlzLiNsb2NhbE5hbWUgPSBuYW1lO1xuICAgIHRoaXMuI21hbmlmZXN0ID0gbWFuaWZlc3Q7XG4gIH1cblxuICBnZXQgI3dvcmtzcGFjZSgpOiBXb3Jrc3BhY2Uge1xuICAgIHJldHVybiB0aGlzLiN3b3Jrc3BhY2VUaHVuaygpO1xuICB9XG5cbiAgZ2V0IG5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYCR7dGhpcy4jd29ya3NwYWNlLm5hbWVzcGFjZX0vJHt0aGlzLiNsb2NhbE5hbWV9YDtcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcm9vdCBvZiB0aGlzIHBhY2thZ2UsIHdoaWNoIGNvbnRhaW5zIHRoZSBwYWNrYWdlLmpzb25cbiAgICovXG4gIGdldCByb290KCk6IEFic29sdXRlUGF0aCB7XG4gICAgcmV0dXJuIEFic29sdXRlUGF0aC5kaXJlY3RvcnkoXG4gICAgICBwYXRoLnJlc29sdmUoXG4gICAgICAgIHRoaXMuI3dvcmtzcGFjZS5yb290LFxuICAgICAgICB0aGlzLiN3b3Jrc3BhY2UubmFtZXNwYWNlLFxuICAgICAgICB0aGlzLiNsb2NhbE5hbWVcbiAgICAgIClcbiAgICApO1xuICB9XG5cbiAgZ2V0IHBhY2thZ2VKU09OKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHBhdGgucmVzb2x2ZSh0aGlzLiN3b3Jrc3BhY2Uucm9vdCk7XG4gIH1cblxuICBhc3luYyBjb21waWxlKHsgZHJ5UnVuIH06IHsgZHJ5UnVuOiBib29sZWFuIH0gPSB7IGRyeVJ1bjogZmFsc2UgfSkge1xuICAgIGxldCB0cmFuc3BpbGF0aW9uID0gYXdhaXQgdGhpcy4jcGFja2FnZVRyYW5zcGlsYXRpb24oKTtcbiAgICBsZXQgcHJlcGFyZSA9IHRyYW5zcGlsYXRpb24ucHJlcGFyZShhd2FpdCB0aGlzLiNnZXREaXN0RmlsZXMoKSk7XG5cbiAgICBwcmVwYXJlLnJ1bih7IGRyeVJ1biB9KTtcblxuICAgIHRyYW5zcGlsYXRpb24udHJhbnNwaWxlKHsgZHJ5UnVuIH0pO1xuICB9XG5cbiAgZ2V0ICNkaXN0KCk6IEFic29sdXRlUGF0aCB7XG4gICAgcmV0dXJuIHRoaXMucm9vdC5kaXJlY3RvcnkoXCJkaXN0XCIpO1xuICB9XG5cbiAgZ2V0ICNmaWxlcygpOiBQcm9taXNlPEFic29sdXRlUGF0aHM+IHtcbiAgICByZXR1cm4gQWJzb2x1dGVQYXRocy5nbG9iKFxuICAgICAgW2AhKG5vZGVfbW9kdWxlc3xkaXN0KSoqLyoudHNgLCBgaW5kZXgudHNgXSxcbiAgICAgIHRoaXMucm9vdFxuICAgICk7XG4gIH1cblxuICBhc3luYyAjcGFja2FnZVRyYW5zcGlsYXRpb24oKTogUHJvbWlzZTxUcmFuc3BpbGF0aW9uPiB7XG4gICAgbGV0IGZpbGVzID0gYXdhaXQgdGhpcy4jZmlsZXM7XG5cbiAgICBsZXQgZHRzID0gZmlsZXMuZmlsdGVyKChmaWxlKSA9PiBmaWxlLmhhc0V4YWN0RXh0ZW5zaW9uKFwiZC50c1wiKSk7XG5cbiAgICBmb3IgKGxldCBmaWxlIG9mIGR0cykge1xuICAgICAgY29uc29sZS53YXJuKGBVbmV4cGVjdGVkIC5kLnRzIGZpbGUgZm91bmQgZHVyaW5nIGNvbXBpbGF0aW9uICgke2ZpbGV9KWApO1xuICAgIH1cblxuICAgIGxldCB0cyA9IGZpbGVzLmZpbHRlcigoZmlsZSkgPT4gZmlsZS5oYXNFeGFjdEV4dGVuc2lvbihcInRzXCIpKTtcblxuICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKGBbVFMtRklMRVNdYCwgdHMpO1xuXG4gICAgcmV0dXJuIFRyYW5zcGlsYXRpb24uY3JlYXRlKFxuICAgICAgdGhpcy5uYW1lLFxuICAgICAgdGhpcy4jZGlzdCxcbiAgICAgIHRzLm1hcEFycmF5KChmaWxlKSA9PiB0aGlzLiNmaWxlVHJhbnNwaWxhdGlvbihmaWxlKSlcbiAgICApO1xuICB9XG5cbiAgYXN5bmMgI2dldERpc3RGaWxlcygpOiBQcm9taXNlPEFic29sdXRlUGF0aHM+IHtcbiAgICByZXR1cm4gdGhpcy4jZGlzdC5nbG9iKFwiKipcIiwgeyBraW5kOiBcImFsbFwiIH0pO1xuICB9XG5cbiAgI2ZpbGVUcmFuc3BpbGF0aW9uKGlucHV0UGF0aDogQWJzb2x1dGVQYXRoKTogVHJhbnNwaWxlVGFzayB7XG4gICAgbGV0IHJlbGF0aXZlUGF0aCA9IGlucHV0UGF0aC5yZWxhdGl2ZUZyb21BbmNlc3Rvcih0aGlzLnJvb3QpO1xuXG4gICAgbGV0IG91dHB1dCA9IHRoaXMuI2Rpc3QuZmlsZShyZWxhdGl2ZVBhdGgpLmNoYW5nZUV4dGVuc2lvbihcImpzXCIpO1xuICAgIGxldCBkaWdlc3QgPSBvdXRwdXQuY2hhbmdlRXh0ZW5zaW9uKFwiZGlnZXN0XCIpO1xuXG4gICAgbG9nLnNpbGVudC5pbnNwZWN0LmxhYmVsZWQoYFtUUkFOU1BJTEVdYCwge1xuICAgICAgaW5wdXQ6IGlucHV0UGF0aCxcbiAgICAgIHJvb3Q6IHRoaXMucm9vdCxcbiAgICAgIHJlbGF0aXZlOiByZWxhdGl2ZVBhdGgsXG4gICAgICBvdXRwdXQsXG4gICAgICBkaWdlc3QsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gVHJhbnNwaWxlVGFzay5jcmVhdGUoaW5wdXRQYXRoLCBvdXRwdXQsIGRpZ2VzdCk7XG4gIH1cbn1cblxuY2xhc3MgVHJhbnNwaWxhdGlvbiB7XG4gIHN0YXRpYyBjcmVhdGUoXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIGRpc3Q6IEFic29sdXRlUGF0aCxcbiAgICB0YXNrczogcmVhZG9ubHkgVHJhbnNwaWxlVGFza1tdXG4gICkge1xuICAgIHJldHVybiBuZXcgVHJhbnNwaWxhdGlvbihuYW1lLCBkaXN0LCB0YXNrcyk7XG4gIH1cblxuICByZWFkb25seSAjbmFtZTogc3RyaW5nO1xuICByZWFkb25seSAjZGlzdDogQWJzb2x1dGVQYXRoO1xuICByZWFkb25seSAjdGFza3M6IHJlYWRvbmx5IFRyYW5zcGlsZVRhc2tbXTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKFxuICAgIG5hbWU6IHN0cmluZyxcbiAgICBkaXN0OiBBYnNvbHV0ZVBhdGgsXG4gICAgdGFza3M6IHJlYWRvbmx5IFRyYW5zcGlsZVRhc2tbXVxuICApIHtcbiAgICB0aGlzLiNuYW1lID0gbmFtZTtcbiAgICB0aGlzLiNkaXN0ID0gZGlzdDtcbiAgICB0aGlzLiN0YXNrcyA9IHRhc2tzO1xuICB9XG5cbiAgcHJlcGFyZShleGlzdGluZzogQWJzb2x1dGVQYXRocyk6IFByZXBhcmVUcmFuc3BpbGF0aW9uIHtcbiAgICAvLyBjb25zb2xlLmxvZyh7IGV4aXN0aW5nLCBvdXRwdXRQYXRoczogdGhpcy5vdXRwdXRQYXRocyB9KTtcblxuICAgIGxldCBkaWdlc3RzID0gZXhpc3RpbmcuZmlsdGVyKChmaWxlKSA9PiBmaWxlLmhhc0V4YWN0RXh0ZW5zaW9uKFwiZGlnZXN0XCIpKTtcbiAgICBsZXQgbm9uRGlnZXN0cyA9IGV4aXN0aW5nLmZpbHRlcihcbiAgICAgIChmaWxlKSA9PiAhZmlsZS5oYXNFeGFjdEV4dGVuc2lvbihcImRpZ2VzdFwiKVxuICAgICk7XG5cbiAgICByZXR1cm4gUHJlcGFyZVRyYW5zcGlsYXRpb24uY3JlYXRlKFxuICAgICAgdGhpcy4jbmFtZSxcbiAgICAgIG5vbkRpZ2VzdHMuZGlmZkJ5S2luZCh0aGlzLm91dHB1dFBhdGhzKSxcbiAgICAgIGRpZ2VzdHMuZGlmZih0aGlzLmRpZ2VzdHMpXG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIHRyYW5zcGlsZSh7IGRyeVJ1biB9OiB7IGRyeVJ1bjogYm9vbGVhbiB9ID0geyBkcnlSdW46IGZhbHNlIH0pIHtcbiAgICBmb3IgKGxldCB0YXNrIG9mIHRoaXMuI3Rhc2tzKSB7XG4gICAgICBsb2cuc2lsZW50LmhlYWRpbmcoYFtUUkFOU1BJTElOR11gLCB0aGlzLiNuYW1lKTtcblxuICAgICAgaWYgKCFkcnlSdW4pIHtcbiAgICAgICAgdGFzay50cmFuc3BpbGUoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBnZXQgb3V0cHV0RmlsZXMoKTogQWJzb2x1dGVQYXRocyB7XG4gICAgcmV0dXJuIEFic29sdXRlUGF0aHMuZnJvbSh0aGlzLiN0YXNrcy5tYXAoKHRhc2spID0+IHRhc2sub3V0cHV0KSk7XG4gIH1cblxuICBnZXQgZGlnZXN0cygpOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICByZXR1cm4gdGhpcy5vdXRwdXRGaWxlcy5tYXAoKGZpbGUpID0+IGZpbGUuY2hhbmdlRXh0ZW5zaW9uKFwiZGlnZXN0XCIpKTtcbiAgfVxuXG4gIGdldCBvdXRwdXRQYXRocygpOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICBsZXQgZmlsZXMgPSB0aGlzLm91dHB1dEZpbGVzO1xuICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKFwiW09VVC1GSUxFU11cIiwgZmlsZXMpO1xuICAgIGxldCBkaXJlY3RvcmllcyA9IGZpbGVzLmRpcmVjdG9yeS53aXRob3V0KHRoaXMuI2Rpc3QpO1xuICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKFwiW09VVC1ESVJTXVwiLCBmaWxlcy5kaXJlY3RvcnkpO1xuXG4gICAgcmV0dXJuIGZpbGVzLm1lcmdlKGRpcmVjdG9yaWVzKTtcbiAgfVxufVxuXG5hYnN0cmFjdCBjbGFzcyBNYXBwYWJsZTxTaW5nbGUsIE11bHRpcGxlPiB7XG4gIGFic3RyYWN0IG1hcChtYXBwZXI6IChwYXRoOiBTaW5nbGUpID0+IFNpbmdsZSB8IG51bGwpOiBNdWx0aXBsZTtcblxuICBhYnN0cmFjdCBmbGF0TWFwKFxuICAgIG1hcHBlcjogKHBhdGg6IFNpbmdsZSkgPT4gcmVhZG9ubHkgU2luZ2xlW10gfCBNdWx0aXBsZSB8IFNpbmdsZVxuICApOiBNdWx0aXBsZTtcblxuICBhYnN0cmFjdCBmaW5kKGZpbmRlcjogKHBhdGg6IFNpbmdsZSkgPT4gYm9vbGVhbik6IFNpbmdsZSB8IHZvaWQ7XG5cbiAgYWJzdHJhY3QgcmVkdWNlPFU+KFxuICAgIG1hcHBlcjogKGJ1aWxkOiBVLCBwYXRoOiBTaW5nbGUpID0+IHZvaWQsXG4gICAgYnVpbGQ6IFUsXG4gICAgc3RyYXRlZ3k6IFwibXV0YXRlXCJcbiAgKTogVTtcbiAgYWJzdHJhY3QgcmVkdWNlPFU+KFxuICAgIG1hcHBlcjogKGFjY3VtdWxhdG9yOiBVLCBwYXRoOiBTaW5nbGUpID0+IHZvaWQsXG4gICAgaW5pdGlhbDogVSxcbiAgICBzdHJhdGVneT86IFwiZnVuY3Rpb25hbFwiXG4gICk6IFU7XG5cbiAgZmlsdGVyKGZpbHRlcjogKGl0ZW06IFNpbmdsZSkgPT4gYm9vbGVhbik6IE11bHRpcGxlIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoKHNpbmdsZSkgPT4gKGZpbHRlcihzaW5nbGUpID8gc2luZ2xlIDogbnVsbCkpO1xuICB9XG5cbiAgbWFwQXJyYXk8VT4obWFwcGVyOiAoaXRlbTogU2luZ2xlKSA9PiBVKTogcmVhZG9ubHkgVVtdIHtcbiAgICByZXR1cm4gdGhpcy5yZWR1Y2UoXG4gICAgICAoYXJyYXk6IFVbXSwgaXRlbSkgPT4gYXJyYXkucHVzaChtYXBwZXIoaXRlbSkpLFxuICAgICAgW10sXG4gICAgICBcIm11dGF0ZVwiXG4gICAgKTtcbiAgfVxufVxuXG5pbnRlcmZhY2UgUGF0aERpZmYge1xuICByZWFkb25seSBhZGRlZDogQWJzb2x1dGVQYXRocztcbiAgcmVhZG9ubHkgcmVtb3ZlZDogQWJzb2x1dGVQYXRocztcbn1cblxuaW50ZXJmYWNlIFBhdGhEaWZmQnlLaW5kIHtcbiAgcmVhZG9ubHkgZmlsZXM6IFBhdGhEaWZmO1xuICByZWFkb25seSBkaXJlY3RvcmllczogUGF0aERpZmY7XG59XG5cbmNsYXNzIEFic29sdXRlUGF0aHNcbiAgZXh0ZW5kcyBNYXBwYWJsZTxBYnNvbHV0ZVBhdGgsIEFic29sdXRlUGF0aHM+XG4gIGltcGxlbWVudHMgSXRlcmFibGU8QWJzb2x1dGVQYXRoPlxue1xuICBzdGF0aWMgZW1wdHkoKTogQWJzb2x1dGVQYXRocyB7XG4gICAgcmV0dXJuIG5ldyBBYnNvbHV0ZVBhdGhzKG5ldyBNYXAoKSk7XG4gIH1cblxuICBzdGF0aWMgZnJvbShcbiAgICBwYXRoczogQWJzb2x1dGVQYXRoIHwgQWJzb2x1dGVQYXRocyB8IEFic29sdXRlUGF0aFtdXG4gICk6IEFic29sdXRlUGF0aHMge1xuICAgIGlmIChwYXRocyBpbnN0YW5jZW9mIEFic29sdXRlUGF0aHMpIHtcbiAgICAgIHJldHVybiBwYXRocztcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IG5ld1BhdGhzID0gQWJzb2x1dGVQYXRocy5lbXB0eSgpO1xuICAgICAgbmV3UGF0aHMuYWRkKHBhdGhzKTtcbiAgICAgIHJldHVybiBuZXdQYXRocztcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgYXN5bmMgYWxsKFxuICAgIGluc2lkZTogQWJzb2x1dGVQYXRoLFxuICAgIG9wdGlvbnM6IHsga2luZDogRmlsZUtpbmQgfCBcImFsbFwiIH0gPSB7IGtpbmQ6IFwicmVndWxhclwiIH1cbiAgKTogUHJvbWlzZTxBYnNvbHV0ZVBhdGhzPiB7XG4gICAgcmV0dXJuIEFic29sdXRlUGF0aHMuZ2xvYihcIioqXCIsIGluc2lkZSwgb3B0aW9ucyk7XG4gIH1cblxuICBzdGF0aWMgYXN5bmMgZ2xvYihcbiAgICBnbG9iOiBzdHJpbmcgfCBzdHJpbmdbXSxcbiAgICBpbnNpZGU6IEFic29sdXRlUGF0aCxcbiAgICB7IGtpbmQgfTogeyBraW5kOiBGaWxlS2luZCB8IFwiYWxsXCIgfSA9IHtcbiAgICAgIGtpbmQ6IFwicmVndWxhclwiLFxuICAgIH1cbiAgKSB7XG4gICAgbGV0IGdsb2JzID0gdHlwZW9mIGdsb2IgPT09IFwic3RyaW5nXCIgPyBbZ2xvYl0gOiBnbG9iO1xuICAgIGxldCBmdWxsR2xvYiA9IGdsb2JzLm1hcCgoZ2xvYikgPT5cbiAgICAgIHBhdGgucmVzb2x2ZShBYnNvbHV0ZVBhdGguZ2V0RmlsZW5hbWUoaW5zaWRlKSwgZ2xvYilcbiAgICApO1xuICAgIHJldHVybiBBYnNvbHV0ZVBhdGhzLiNnbG9iKGZ1bGxHbG9iLCBraW5kKTtcbiAgfVxuXG4gIHN0YXRpYyBhc3luYyAjZ2xvYihcbiAgICBnbG9iczogc3RyaW5nW10sXG4gICAga2luZDogRmlsZUtpbmQgfCBcImFsbFwiXG4gICk6IFByb21pc2U8QWJzb2x1dGVQYXRocz4ge1xuICAgIHN3aXRjaCAoa2luZCkge1xuICAgICAgY2FzZSBcImRpcmVjdG9yeVwiOiB7XG4gICAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGhzLm1hcmtlZChcbiAgICAgICAgICBhd2FpdCBzZWFyY2hHbG9iKGdsb2JzLCB7XG4gICAgICAgICAgICBtYXJrRGlyZWN0b3JpZXM6IHRydWUsXG4gICAgICAgICAgICBvbmx5RGlyZWN0b3JpZXM6IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgY2FzZSBcInJlZ3VsYXJcIjoge1xuICAgICAgICByZXR1cm4gQWJzb2x1dGVQYXRocy5tYXJrZWQoXG4gICAgICAgICAgYXdhaXQgc2VhcmNoR2xvYihnbG9icywge1xuICAgICAgICAgICAgb25seUZpbGVzOiB0cnVlLFxuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIGNhc2UgXCJhbGxcIjoge1xuICAgICAgICByZXR1cm4gQWJzb2x1dGVQYXRocy5tYXJrZWQoXG4gICAgICAgICAgYXdhaXQgc2VhcmNoR2xvYihnbG9icywge1xuICAgICAgICAgICAgb25seUZpbGVzOiBmYWxzZSxcbiAgICAgICAgICAgIG9ubHlEaXJlY3RvcmllczogZmFsc2UsXG4gICAgICAgICAgICBtYXJrRGlyZWN0b3JpZXM6IHRydWUsXG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgZGVmYXVsdDoge1xuICAgICAgICBleGhhdXN0aXZlKGtpbmQsIFwia2luZFwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBzdGF0aWMgbWFya2VkKHBhdGhzOiBJdGVyYWJsZTxzdHJpbmc+KTogQWJzb2x1dGVQYXRocyB7XG4gICAgbGV0IHNldCA9IEFic29sdXRlUGF0aHMuZW1wdHkoKTtcbiAgICBzZXQuYWRkKFsuLi5wYXRoc10ubWFwKEFic29sdXRlUGF0aC5tYXJrZWQpKTtcbiAgICByZXR1cm4gc2V0O1xuICB9XG5cbiAgI3BhdGhzOiBNYXA8c3RyaW5nLCBBYnNvbHV0ZVBhdGg+O1xuXG4gIGNvbnN0cnVjdG9yKHBhdGhzOiBNYXA8c3RyaW5nLCBBYnNvbHV0ZVBhdGg+KSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLiNwYXRocyA9IHBhdGhzO1xuICB9XG5cbiAgY2xvbmUoKTogQWJzb2x1dGVQYXRocyB7XG4gICAgcmV0dXJuIG5ldyBBYnNvbHV0ZVBhdGhzKG5ldyBNYXAodGhpcy4jcGF0aHMpKTtcbiAgfVxuXG4gIGdldCBzaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuI3BhdGhzLnNpemU7XG4gIH1cblxuICBnZXQgcmVndWxhckZpbGVzKCk6IEFic29sdXRlUGF0aHMge1xuICAgIHJldHVybiB0aGlzLm1hcCgocGF0aCkgPT4gKHBhdGguaXNSZWd1bGFyRmlsZSA/IHBhdGggOiBudWxsKSk7XG4gIH1cblxuICBnZXQgZGlyZWN0b3JpZXMoKTogQWJzb2x1dGVQYXRocyB7XG4gICAgcmV0dXJuIHRoaXMubWFwKChwYXRoKSA9PiAocGF0aC5pc0RpcmVjdG9yeSA/IHBhdGggOiBudWxsKSk7XG4gIH1cblxuICAvKipcbiAgICogTWFwIGVhY2ggcGF0aCBpbiB0aGlzIHNldDpcbiAgICpcbiAgICogLSBpZiBpdCdzIGEgZGlyZWN0b3J5LCBsZWF2ZSBpdCBhbG9uZVxuICAgKiAtIGlmIGl0J3MgYSByZWd1bGFyIGZpbGUsIGdldCB0aGUgZmlsZSdzIGRpcmVjdG9yeVxuICAgKi9cbiAgZ2V0IGRpcmVjdG9yeSgpOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICByZXR1cm4gdGhpcy5tYXAoKHBhdGgpID0+IChwYXRoLmlzRGlyZWN0b3J5ID8gcGF0aCA6IHBhdGgucGFyZW50KSk7XG4gIH1cblxuICB3aXRob3V0KHBhdGhzOiBBYnNvbHV0ZVBhdGggfCBBYnNvbHV0ZVBhdGhzIHwgQWJzb2x1dGVQYXRoW10pIHtcbiAgICBsZXQgcmVtb3ZlID0gQWJzb2x1dGVQYXRocy5mcm9tKHBhdGhzKTtcbiAgICBsZXQgZmlsdGVyZWQgPSBuZXcgTWFwKFxuICAgICAgWy4uLnRoaXMuI3BhdGhzXS5maWx0ZXIoKFssIHBhdGhdKSA9PiAhcmVtb3ZlLmhhcyhwYXRoKSlcbiAgICApO1xuXG4gICAgcmV0dXJuIG5ldyBBYnNvbHV0ZVBhdGhzKGZpbHRlcmVkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgYW55IG9mIHRoZSBmaWxlcyBpbiB0aGlzIHNldCBhcmUgZGlyZWN0b3JpZXMgdGhhdCBjb250YWluIHRoaXMgcGF0aFxuICAgKi9cbiAgY29udGFpbnMobWF5YmVDaGlsZDogQWJzb2x1dGVQYXRoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5maW5kKChwYXRoKSA9PiBwYXRoLmNvbnRhaW5zKG1heWJlQ2hpbGQpKTtcbiAgfVxuXG4gIGRpZmYob3RoZXI6IEFic29sdXRlUGF0aHMpOiB7IGFkZGVkOiBBYnNvbHV0ZVBhdGhzOyByZW1vdmVkOiBBYnNvbHV0ZVBhdGhzIH0ge1xuICAgIGxldCB7IGFkZGVkLCByZW1vdmVkIH0gPSBkaWZmRmlsZXModGhpcywgb3RoZXIpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFkZGVkLFxuICAgICAgcmVtb3ZlZCxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFRoaXMgbWV0aG9kIGRpZmZzIGZpbGVzIGFuZCBkaXJlY3RvcmllcywgYnV0IGV4Y2x1ZGVzIGFueSByZW1vdmVkIGZpbGVzXG4gICAqIHRoYXQgYXJlIGRlc2NlbmRlbnRzIG9mIGEgcmVtb3ZlZCBkaXJlY3RvcnkuXG4gICAqL1xuICBkaWZmQnlLaW5kKG90aGVyOiBBYnNvbHV0ZVBhdGhzKTogUGF0aERpZmZCeUtpbmQge1xuICAgIC8vIGNvbnNvbGUubG9nKHsgY3VycmVudDogdGhpcy5kaXJlY3RvcmllcywgbmV4dDogb3RoZXIuZGlyZWN0b3JpZXMgfSk7XG5cbiAgICBsZXQgZGlyZWN0b3JpZXMgPSB0aGlzLmRpcmVjdG9yaWVzLmRpZmYob3RoZXIuZGlyZWN0b3JpZXMpO1xuXG4gICAgbG9nLnNpbGVudFxuICAgICAgLm5ld2xpbmUoKVxuICAgICAgLmhlYWRpbmcoXCJEaXJlY3Rvcmllc1wiKVxuICAgICAgLm5ld2xpbmUoKVxuICAgICAgLmluc3BlY3QubGFiZWxlZChcIltMSFNdXCIsIHRoaXMuZGlyZWN0b3JpZXMpXG4gICAgICAubmV3bGluZSgpXG4gICAgICAuaW5zcGVjdC5sYWJlbGVkKFwiW1JIU11cIiwgb3RoZXIuZGlyZWN0b3JpZXMpXG4gICAgICAubmV3bGluZSgpXG4gICAgICAuaW5zcGVjdC5sYWJlbGVkKFwiW0RJRkZdXCIsIGRpcmVjdG9yaWVzKTtcblxuICAgIGxldCBjb2xsYXBzZWREaXJlY3RvcmllcyA9IGRpcmVjdG9yaWVzLnJlbW92ZWQuY29sbGFwc2VkRGlyZWN0b3JpZXMoKTtcblxuICAgIGxvZy5zaWxlbnQubmV3bGluZSgpLmluc3BlY3QubGFiZWxlZChcIltDTFBTXVwiLCBjb2xsYXBzZWREaXJlY3Rvcmllcyk7XG5cbiAgICBsZXQgZmlsZXMgPSB0aGlzLnJlZ3VsYXJGaWxlcy5kaWZmKG90aGVyLnJlZ3VsYXJGaWxlcyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZmlsZXM6IHtcbiAgICAgICAgYWRkZWQ6IGZpbGVzLmFkZGVkLFxuICAgICAgICByZW1vdmVkOiBmaWxlcy5yZW1vdmVkLnJlbW92ZURlc2NlbmRlbnRzT2YoY29sbGFwc2VkRGlyZWN0b3JpZXMpLFxuICAgICAgfSxcbiAgICAgIGRpcmVjdG9yaWVzOiB7XG4gICAgICAgIGFkZGVkOiBkaXJlY3Rvcmllcy5hZGRlZCxcbiAgICAgICAgcmVtb3ZlZDogY29sbGFwc2VkRGlyZWN0b3JpZXMsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ29sbGFwc2UgYW55IGNoaWxkIGRpcmVjdG9yaWVzIGludG8gdGhlaXIgcGFyZW50cy5cbiAgICovXG4gIGNvbGxhcHNlZERpcmVjdG9yaWVzKCk6IEFic29sdXRlUGF0aHMge1xuICAgIGxldCBjb2xsYXBzZWQgPSBBYnNvbHV0ZVBhdGhzLmVtcHR5KCk7XG5cbiAgICBmb3IgKGxldCB7IHBhdGgsIHJlc3QgfSBvZiB0aGlzLiNkcmFpbigpKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZyh7IHBhdGgsIHJlc3QgfSk7XG4gICAgICBpZiAocGF0aC5pc1JlZ3VsYXJGaWxlIHx8ICFyZXN0LmNvbnRhaW5zKHBhdGgpKSB7XG4gICAgICAgIGNvbGxhcHNlZC5hZGQocGF0aCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy4jcGF0aHMgPSBjb2xsYXBzZWQuI3BhdGhzO1xuICAgIHJldHVybiBjb2xsYXBzZWQ7XG4gIH1cblxuICByZW1vdmVEZXNjZW5kZW50c09mKGFuY2VzdG9yczogQWJzb2x1dGVQYXRocyk6IEFic29sdXRlUGF0aHMge1xuICAgIHJldHVybiB0aGlzLm1hcCgocGF0aCkgPT4gKGFuY2VzdG9ycy5jb250YWlucyhwYXRoKSA/IG51bGwgOiBwYXRoKSk7XG4gIH1cblxuICBtZXJnZShcbiAgICBwYXRoczogQWJzb2x1dGVQYXRoIHwgQWJzb2x1dGVQYXRocyB8IHJlYWRvbmx5IEFic29sdXRlUGF0aFtdXG4gICk6IEFic29sdXRlUGF0aHMge1xuICAgIGxldCBjbG9uZWQgPSB0aGlzLmNsb25lKCk7XG4gICAgY2xvbmVkLmFkZChwYXRocyk7XG4gICAgcmV0dXJuIGNsb25lZDtcbiAgfVxuXG4gIGFkZChwYXRoczogQWJzb2x1dGVQYXRoIHwgQWJzb2x1dGVQYXRocyB8IHJlYWRvbmx5IEFic29sdXRlUGF0aFtdKTogdm9pZCB7XG4gICAgaWYgKGlzQXJyYXkocGF0aHMpKSB7XG4gICAgICBmb3IgKGxldCBwYXRoIG9mIHBhdGhzKSB7XG4gICAgICAgIHRoaXMuI2FkZChwYXRoKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHBhdGhzIGluc3RhbmNlb2YgQWJzb2x1dGVQYXRocykge1xuICAgICAgZm9yIChsZXQgcGF0aCBvZiBwYXRocykge1xuICAgICAgICB0aGlzLiNhZGQocGF0aCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuI2FkZChwYXRocyk7XG4gICAgfVxuICB9XG5cbiAgI2FkZCguLi5wYXRoczogcmVhZG9ubHkgQWJzb2x1dGVQYXRoW10pOiB2b2lkIHtcbiAgICBmb3IgKGxldCBwYXRoIG9mIHBhdGhzKSB7XG4gICAgICBsZXQgZmlsZW5hbWUgPSBBYnNvbHV0ZVBhdGguZ2V0RmlsZW5hbWUocGF0aCk7XG5cbiAgICAgIGlmICghdGhpcy4jcGF0aHMuaGFzKGZpbGVuYW1lKSkge1xuICAgICAgICB0aGlzLiNwYXRocy5zZXQoZmlsZW5hbWUsIHBhdGgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJlbW92ZShwYXRoczogQWJzb2x1dGVQYXRocyB8IEFic29sdXRlUGF0aCkge1xuICAgIGxldCB0aGlzUGF0aHMgPSB0aGlzLiNwYXRocztcblxuICAgIGlmIChwYXRocyBpbnN0YW5jZW9mIEFic29sdXRlUGF0aCkge1xuICAgICAgbGV0IGZpbGVuYW1lID0gQWJzb2x1dGVQYXRoLmdldEZpbGVuYW1lKHBhdGhzKTtcbiAgICAgIHRoaXNQYXRocy5kZWxldGUoZmlsZW5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGxldCBmaWxlbmFtZSBvZiBwYXRocy4jcGF0aHMua2V5cygpKSB7XG4gICAgICAgIHRoaXNQYXRocy5kZWxldGUoZmlsZW5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGhhcyhwYXRoOiBBYnNvbHV0ZVBhdGgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy4jcGF0aHMuaGFzKEFic29sdXRlUGF0aC5nZXRGaWxlbmFtZShwYXRoKSk7XG4gIH1cblxuICByZWR1Y2U8VT4oXG4gICAgbWFwcGVyOiAoYnVpbGQ6IFUsIHBhdGg6IEFic29sdXRlUGF0aCkgPT4gdm9pZCxcbiAgICBidWlsZDogVSxcbiAgICBzdHJhdGVneTogXCJtdXRhdGVcIlxuICApOiBVO1xuICByZWR1Y2U8VT4oXG4gICAgbWFwcGVyOiAoYWNjdW11bGF0b3I6IFUsIHBhdGg6IEFic29sdXRlUGF0aCkgPT4gdm9pZCxcbiAgICBpbml0aWFsOiBVLFxuICAgIHN0cmF0ZWd5PzogXCJmdW5jdGlvbmFsXCJcbiAgKTogVTtcbiAgcmVkdWNlPFU+KFxuICAgIG1hcHBlcjogKGJ1aWxkOiBVLCBwYXRoOiBBYnNvbHV0ZVBhdGgpID0+IFUgfCB2b2lkLFxuICAgIGluaXRpYWw6IFUsXG4gICAgc3RyYXRlZ3k6IFwiZnVuY3Rpb25hbFwiIHwgXCJtdXRhdGVcIiA9IFwiZnVuY3Rpb25hbFwiXG4gICk6IFUge1xuICAgIGlmIChzdHJhdGVneSA9PT0gXCJtdXRhdGVcIikge1xuICAgICAgZm9yIChsZXQgcGF0aCBvZiB0aGlzKSB7XG4gICAgICAgIG1hcHBlcihpbml0aWFsLCBwYXRoKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGluaXRpYWw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBhY2N1bXVsYXRvciA9IGluaXRpYWw7XG5cbiAgICAgIGZvciAobGV0IHBhdGggb2YgdGhpcykge1xuICAgICAgICBhY2N1bXVsYXRvciA9IG1hcHBlcihhY2N1bXVsYXRvciwgcGF0aCkgYXMgVTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGFjY3VtdWxhdG9yO1xuICAgIH1cbiAgfVxuXG4gIG1hcChtYXBwZXI6IChwYXRoOiBBYnNvbHV0ZVBhdGgpID0+IEFic29sdXRlUGF0aCB8IG51bGwpOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICBsZXQgcGF0aHMgPSBBYnNvbHV0ZVBhdGhzLmVtcHR5KCk7XG5cbiAgICBmb3IgKGxldCBwYXRoIG9mIHRoaXMuI3BhdGhzLnZhbHVlcygpKSB7XG4gICAgICBsZXQgbWFwcGVkUGF0aCA9IG1hcHBlcihwYXRoKTtcblxuICAgICAgaWYgKG1hcHBlZFBhdGgpIHtcbiAgICAgICAgcGF0aHMuYWRkKG1hcHBlZFBhdGgpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBwYXRocztcbiAgfVxuXG4gIGZsYXRNYXAoXG4gICAgbWFwcGVyOiAoXG4gICAgICBwYXRoOiBBYnNvbHV0ZVBhdGhcbiAgICApID0+IHJlYWRvbmx5IEFic29sdXRlUGF0aFtdIHwgQWJzb2x1dGVQYXRocyB8IEFic29sdXRlUGF0aFxuICApOiBBYnNvbHV0ZVBhdGhzIHtcbiAgICBsZXQgcGF0aHMgPSBBYnNvbHV0ZVBhdGhzLmVtcHR5KCk7XG5cbiAgICBmb3IgKGxldCBwYXRoIG9mIHRoaXMuI3BhdGhzLnZhbHVlcygpKSB7XG4gICAgICBwYXRocy5hZGQobWFwcGVyKHBhdGgpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGF0aHM7XG4gIH1cblxuICBmaW5kKGZpbmRlcjogKHBhdGg6IEFic29sdXRlUGF0aCkgPT4gYm9vbGVhbik6IEFic29sdXRlUGF0aCB8IHZvaWQge1xuICAgIGZvciAobGV0IHBhdGggb2YgdGhpcy4jcGF0aHMudmFsdWVzKCkpIHtcbiAgICAgIGxldCBmb3VuZCA9IGZpbmRlcihwYXRoKTtcblxuICAgICAgaWYgKGZvdW5kKSB7XG4gICAgICAgIHJldHVybiBwYXRoO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGdldCAjc29ydGVkKCk6IE1hcDxzdHJpbmcsIEFic29sdXRlUGF0aD4ge1xuICAgIGxldCBlbnRyaWVzID0gWy4uLnRoaXMuI3BhdGhzLmVudHJpZXMoKV0uc29ydChcbiAgICAgIChbYV0sIFtiXSkgPT4gYi5sZW5ndGggLSBhLmxlbmd0aFxuICAgICk7XG4gICAgcmV0dXJuIG5ldyBNYXAoZW50cmllcyk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZSB0aGUgcGF0aHMgaW4gdGhpcyBzZXQuIExhcmdlciBwYXRocyBjb21lIGZpcnN0LlxuICAgKi9cbiAgKiNkcmFpbigpOiBJdGVyYWJsZUl0ZXJhdG9yPHsgcGF0aDogQWJzb2x1dGVQYXRoOyByZXN0OiBBYnNvbHV0ZVBhdGhzIH0+IHtcbiAgICBsZXQgcmVzdCA9IHRoaXMuI3NvcnRlZC5lbnRyaWVzKCk7XG4gICAgbGV0IG5leHQgPSByZXN0Lm5leHQoKTtcblxuICAgIHdoaWxlICghbmV4dC5kb25lKSB7XG4gICAgICBsZXQgWywgcGF0aF0gPSBuZXh0LnZhbHVlO1xuICAgICAgbGV0IHJlc3RQYXRocyA9IG5ldyBBYnNvbHV0ZVBhdGhzKG5ldyBNYXAocmVzdCkpO1xuXG4gICAgICB5aWVsZCB7IHBhdGgsIHJlc3Q6IHJlc3RQYXRocyB9O1xuXG4gICAgICByZXN0ID0gcmVzdFBhdGhzLiNwYXRocy5lbnRyaWVzKCk7XG4gICAgICBuZXh0ID0gcmVzdC5uZXh0KCk7XG4gICAgfVxuICB9XG5cbiAgKltTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAgIGZvciAobGV0IHBhdGggb2YgdGhpcy4jc29ydGVkLnZhbHVlcygpKSB7XG4gICAgICB5aWVsZCBwYXRoO1xuICAgIH1cbiAgfVxuXG4gIFtJTlNQRUNUXSgpIHtcbiAgICByZXR1cm4gWy4uLnRoaXNdO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRpZmZGaWxlcyhwcmV2OiBBYnNvbHV0ZVBhdGhzLCBuZXh0OiBBYnNvbHV0ZVBhdGhzKSB7XG4gIGxldCBhZGRlZCA9IEFic29sdXRlUGF0aHMuZW1wdHkoKTtcbiAgbGV0IHJlbW92ZWQgPSBBYnNvbHV0ZVBhdGhzLmVtcHR5KCk7XG5cbiAgZm9yIChsZXQgcGF0aCBvZiBuZXh0KSB7XG4gICAgaWYgKCFwcmV2LmhhcyhwYXRoKSkge1xuICAgICAgYWRkZWQuYWRkKHBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIGZvciAobGV0IHBhdGggb2YgcHJldikge1xuICAgIGlmICghbmV4dC5oYXMocGF0aCkpIHtcbiAgICAgIHJlbW92ZWQuYWRkKHBhdGgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7IGFkZGVkLCByZW1vdmVkIH07XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXk8VCBleHRlbmRzIHVua25vd25bXSB8IHJlYWRvbmx5IHVua25vd25bXT4oXG4gIHZhbHVlOiB1bmtub3duIHwgVFxuKTogdmFsdWUgaXMgVCB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gaXNSb290KHA6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gcGF0aC5wYXJzZShwKS5yb290ID09PSBwO1xufVxuXG50eXBlIEZpbGVLaW5kID0gXCJyZWd1bGFyXCIgfCBcImRpcmVjdG9yeVwiO1xudHlwZSBTZWFyY2hLaW5kID0gRmlsZUtpbmQgfCBcImFsbFwiO1xudHlwZSBBYnNvbHV0ZVBhdGhLaW5kID0gRmlsZUtpbmQgfCBcInJvb3RcIjtcbnR5cGUgSW50b0Fic29sdXRlUGF0aCA9XG4gIHwgQWJzb2x1dGVQYXRoXG4gIHwgRmlsZVBhcnRzXG4gIHwgW2tpbmQ6IEFic29sdXRlUGF0aEtpbmQgfCBcIm1hcmtlZFwiLCBmaWxlbmFtZTogc3RyaW5nXTtcblxuaW50ZXJmYWNlIFNlYXJjaCB7XG4gIGtpbmQ6IFNlYXJjaEtpbmQ7XG59XG5cbmNsYXNzIEFic29sdXRlUGF0aCB7XG4gIHN0YXRpYyBmaWxlKHBhdGg6IHN0cmluZyk6IEFic29sdXRlUGF0aCB7XG4gICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChwYXRoLCBcInJlZ3VsYXJcIiwgXCIuZmlsZVwiKTtcbiAgfVxuXG4gIHN0YXRpYyBmcm9tKGludG9QYXRoOiBJbnRvQWJzb2x1dGVQYXRoKTogQWJzb2x1dGVQYXRoIHtcbiAgICBpZiAoaXNBcnJheShpbnRvUGF0aCkpIHtcbiAgICAgIGxldCBba2luZCwgZmlsZW5hbWVdID0gaW50b1BhdGg7XG5cbiAgICAgIHN3aXRjaCAoa2luZCkge1xuICAgICAgICBjYXNlIFwicm9vdFwiOlxuICAgICAgICBjYXNlIFwiZGlyZWN0b3J5XCI6XG4gICAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC5kaXJlY3RvcnkoZmlsZW5hbWUpO1xuICAgICAgICBjYXNlIFwibWFya2VkXCI6XG4gICAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC5tYXJrZWQoZmlsZW5hbWUpO1xuICAgICAgICBjYXNlIFwicmVndWxhclwiOlxuICAgICAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguZmlsZShmaWxlbmFtZSk7XG5cbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBleGhhdXN0aXZlKGtpbmQsIFwia2luZFwiKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGludG9QYXRoIGluc3RhbmNlb2YgQWJzb2x1dGVQYXRoKSB7XG4gICAgICByZXR1cm4gaW50b1BhdGg7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCB7XG4gICAgICAgIHBhcmVudCxcbiAgICAgICAgYmFzZW5hbWU6IHsgZmlsZSwgZXh0IH0sXG4gICAgICAgIGtpbmQsXG4gICAgICB9ID0gaW50b1BhdGg7XG5cbiAgICAgIGlmIChwYXJlbnQpIHtcbiAgICAgICAgaWYgKGV4dCkge1xuICAgICAgICAgIGxldCBmaWxlbmFtZSA9IHBhdGgucmVzb2x2ZShwYXJlbnQsIGAke2ZpbGV9LiR7ZXh0fWApO1xuICAgICAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguI2NoZWNrZWQoZmlsZW5hbWUsIGtpbmQgPz8gXCJyZWd1bGFyXCIsIFwiLmZyb21cIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IGZpbGVuYW1lID0gcGF0aC5yZXNvbHZlKHBhcmVudCwgZmlsZSk7XG4gICAgICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChmaWxlbmFtZSwga2luZCA/PyBcInJlZ3VsYXJcIiwgXCIuZnJvbVwiKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gbm8gcGFyZW50IG1lYW5zIHRoZSBmaWxlIHJlcHJlc2VudHMgdGhlIHJvb3RcbiAgICAgICAgaWYgKHR5cGVvZiBraW5kID09PSBcInN0cmluZ1wiICYmIGtpbmQgIT09IFwicm9vdFwiKSB7XG4gICAgICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgICAgICBgQlVHOiBnZXRQYXJ0cygpIHByb2R1Y2VkIHsgcGFyZW50OiBudWxsLCBraW5kOiBub3QgJ3Jvb3QnIH0gKGludmFyaWFudCBjaGVjaylgXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguI2NoZWNrZWQoZmlsZSwgXCJyb290XCIsIFwiLmZyb21cIik7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIGRpcmVjdG9yeShkaXJlY3Rvcnk6IHN0cmluZyk6IEFic29sdXRlUGF0aCB7XG4gICAgaWYgKGlzUm9vdChkaXJlY3RvcnkpKSB7XG4gICAgICByZXR1cm4gQWJzb2x1dGVQYXRoLiNjaGVja2VkKGRpcmVjdG9yeSwgXCJyb290XCIsIFwiLmRpcmVjdG9yeVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChkaXJlY3RvcnksIFwiZGlyZWN0b3J5XCIsIFwiLmRpcmVjdG9yeVwiKTtcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgbWFya2VkKHBhdGg6IHN0cmluZyk6IEFic29sdXRlUGF0aCB7XG4gICAgaWYgKGlzUm9vdChwYXRoKSkge1xuICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChwYXRoLCBcInJvb3RcIiwgXCIubWFya2VkXCIpO1xuICAgIH0gZWxzZSBpZiAocGF0aC5lbmRzV2l0aChcIi9cIikpIHtcbiAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguI2NoZWNrZWQocGF0aC5zbGljZSgwLCAtMSksIFwiZGlyZWN0b3J5XCIsIFwiLm1hcmtlZFwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIEFic29sdXRlUGF0aC4jY2hlY2tlZChwYXRoLCBcInJlZ3VsYXJcIiwgXCIubWFya2VkXCIpO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyAjY2hlY2tlZChcbiAgICBmaWxlbmFtZTogc3RyaW5nLFxuICAgIGtpbmQ6IFwicm9vdFwiIHwgXCJkaXJlY3RvcnlcIiB8IFwicmVndWxhclwiLFxuICAgIGZyb21TdGF0aWNNZXRob2Q6IHN0cmluZ1xuICApOiBBYnNvbHV0ZVBhdGgge1xuICAgIGlmIChpc0Fic29sdXRlKGZpbGVuYW1lKSkge1xuICAgICAgcmV0dXJuIG5ldyBBYnNvbHV0ZVBhdGgoa2luZCwgZmlsZW5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgYFVuZXhwZWN0ZWQgcmVsYXRpdmUgcGF0aCBwYXNzZWQgdG8gQWJzb2x1dGVQYXRoJHtmcm9tU3RhdGljTWV0aG9kfSAoJHtwYXRofSlgXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBnZXRGaWxlbmFtZShwYXRoOiBBYnNvbHV0ZVBhdGgpOiBzdHJpbmcge1xuICAgIHJldHVybiBwYXRoLiNmaWxlbmFtZTtcbiAgfVxuXG4gIC8vIEEgZGlyZWN0b3J5IGVuZHMgd2l0aCBgL2AsIHdoaWxlIGEgZmlsZSBkb2VzIG5vdFxuICByZWFkb25seSAja2luZDogXCJyZWd1bGFyXCIgfCBcImRpcmVjdG9yeVwiIHwgXCJyb290XCI7XG4gIHJlYWRvbmx5ICNmaWxlbmFtZTogc3RyaW5nO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAga2luZDogXCJyZWd1bGFyXCIgfCBcImRpcmVjdG9yeVwiIHwgXCJyb290XCIsXG4gICAgZmlsZW5hbWU6IHN0cmluZ1xuICApIHtcbiAgICB0aGlzLiNraW5kID0ga2luZDtcbiAgICB0aGlzLiNmaWxlbmFtZSA9IGZpbGVuYW1lO1xuICB9XG5cbiAgZ2V0IGlzUm9vdCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy4ja2luZCA9PT0gXCJyb290XCI7XG4gIH1cblxuICBnZXQgaXNEaXJlY3RvcnkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuI2tpbmQgPT09IFwiZGlyZWN0b3J5XCIgfHwgdGhpcy4ja2luZCA9PT0gXCJyb290XCI7XG4gIH1cblxuICBnZXQgaXNSZWd1bGFyRmlsZSgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy4ja2luZCA9PT0gXCJyZWd1bGFyXCI7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwYXJlbnQgZGlyZWN0b3J5IG9mIHRoaXMgQWJzb2x1dGVQYXRoLiBJZiB0aGlzIHBhdGggcmVwcmVzZW50cyBhXG4gICAqIGZpbGUgc3lzdGVtIHJvb3QsIGBwYXJlbnRgIHJldHVybnMgbnVsbC5cbiAgICovXG4gIGdldCBwYXJlbnQoKTogQWJzb2x1dGVQYXRoIHwgbnVsbCB7XG4gICAgLy8gQXZvaWQgaW5maW5pdGUgcmVjdXJzaW9uIGF0IHRoZSByb290IChgL2Agb3IgYEM6XFxgLCBldGMuKVxuICAgIGlmICh0aGlzLmlzUm9vdCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguZGlyZWN0b3J5KHBhdGguZGlybmFtZSh0aGlzLiNmaWxlbmFtZSkpO1xuICAgIH1cbiAgfVxuXG4gIGdldCBiYXNlbmFtZSgpOiB7IGZpbGU6IHN0cmluZzsgZXh0OiBzdHJpbmcgfCBudWxsIH0ge1xuICAgIHJldHVybiBnZXRQYXJ0cyh0aGlzLiNmaWxlbmFtZSkuYmFzZW5hbWU7XG4gIH1cblxuICBnZXQgZXh0ZW5zaW9uKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmJhc2VuYW1lLmV4dDtcbiAgfVxuXG4gIGFzeW5jIHJlYWQoKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgaWYgKHRoaXMuI2tpbmQgIT09IFwicmVndWxhclwiKSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgYFlvdSBjYW4gb25seSByZWFkIGZyb20gYSByZWd1bGFyIGZpbGUgKGZpbGU9JHt0aGlzLiNmaWxlbmFtZX0pYFxuICAgICAgKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IGZzLnJlYWRGaWxlKHRoaXMuI2ZpbGVuYW1lLCB7IGVuY29kaW5nOiBcInV0Zi04XCIgfSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgZGlnZXN0KCk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGxldCBjb250ZW50cyA9IGF3YWl0IHRoaXMucmVhZCgpO1xuICAgIHJldHVybiBjb250ZW50cyA9PT0gbnVsbCA/IG51bGwgOiBkaWdlc3QoY29udGVudHMpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgc3BlY2lmaWVkIGV4dGVuc2lvbiBpcyBhdCB0aGUgZW5kIG9mIHRoZSBmaWxlbmFtZS4gVGhpc1xuICAgKiBtZWFucyB0aGF0IGBpbmRleC5kLnRzYCBoYXMgdGhlIGV4dGVuc2lvbiBgZC50c2AgKmFuZCogYHRzYC5cbiAgICpcbiAgICogU2VlIGhhc0V4YWN0RXh0ZW5zaW9uIGlmIHlvdSB3YW50IGBkLnRzYCB0byBtYXRjaCwgYnV0IG5vdCBgdHNgXG4gICAqL1xuICBoYXNFeHRlbnNpb248UyBleHRlbmRzIGAuJHtzdHJpbmd9YD4oXG4gICAgZXh0ZW5zaW9uOiBTXG4gICk6IGBUaGUgZXh0ZW5zaW9uIHBhc3NlZCB0byBoYXNFeHRlbnNpb24gc2hvdWxkIG5vdCBoYXZlIGEgbGVhZGluZyAnLidgO1xuICBoYXNFeHRlbnNpb24oZXh0ZW5zaW9uOiBzdHJpbmcpOiBib29sZWFuO1xuICBoYXNFeHRlbnNpb24oZXh0ZW5zaW9uOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICBpZiAoZXh0ZW5zaW9uLnN0YXJ0c1dpdGgoXCIuXCIpKSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgYFRoZSBleHRlbnNpb24gcGFzc2VkIHRvIGhhc0V4dGVuc2lvbiBzaG91bGQgbm90IGhhdmUgYSBsZWFkaW5nICcuJ2BcbiAgICAgICk7XG4gICAgfVxuXG4gICAgbGV0IHtcbiAgICAgIGJhc2VuYW1lOiB7IGV4dCB9LFxuICAgIH0gPSBnZXRQYXJ0cyh0aGlzLiNmaWxlbmFtZSk7XG5cbiAgICByZXR1cm4gZXh0ID09PSBleHRlbnNpb247XG4gIH1cblxuICBjaGFuZ2VFeHRlbnNpb248UyBleHRlbmRzIGAuJHtzdHJpbmd9YD4oXG4gICAgZXh0ZW5zaW9uOiBTXG4gICk6IGBUaGUgZXh0ZW5zaW9uIHBhc3NlZCB0byBoYXNFeHRlbnNpb24gc2hvdWxkIG5vdCBoYXZlIGEgbGVhZGluZyAnLidgO1xuICBjaGFuZ2VFeHRlbnNpb24oZXh0ZW5zaW9uOiBzdHJpbmcpOiBBYnNvbHV0ZVBhdGg7XG4gIGNoYW5nZUV4dGVuc2lvbihleHRlbnNpb246IHN0cmluZyk6IHVua25vd24ge1xuICAgIGxldCB7XG4gICAgICBwYXJlbnQsXG4gICAgICBiYXNlbmFtZTogeyBmaWxlIH0sXG4gICAgfSA9IGdldFBhcnRzKHRoaXMuI2ZpbGVuYW1lKTtcblxuICAgIGxldCByZW5hbWVkID0gYCR7ZmlsZX0uJHtleHRlbnNpb259YDtcblxuICAgIGlmIChwYXJlbnQpIHtcbiAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguZmlsZShwYXRoLnJlc29sdmUocGFyZW50LCByZW5hbWVkKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBBYnNvbHV0ZVBhdGguZmlsZShyZW5hbWVkKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIHRoZSBmaWxlIG1hdGNoZXMgdGhlIGV4YWN0IGV4dGVuc2lvbi4gVGhpcyBtZWFucyB0aGF0XG4gICAqIGBpbmRleC5kLnRzYCBoYXMgdGhlIGV4YWN0IGV4dGVuc2lvbiBgZC50c2AgYnV0ICpub3QqIGB0c2AuXG4gICAqL1xuICBoYXNFeGFjdEV4dGVuc2lvbjxTIGV4dGVuZHMgYC4ke3N0cmluZ31gPihcbiAgICBleHRlbnNpb246IFNcbiAgKTogYFRoZSBleHRlbnNpb24gcGFzc2VkIHRvIGhhc0V4dGVuc2lvbiBzaG91bGQgbm90IGhhdmUgYSBsZWFkaW5nICcuJ2A7XG4gIGhhc0V4YWN0RXh0ZW5zaW9uKGV4dGVuc2lvbjogc3RyaW5nKTogYm9vbGVhbjtcbiAgaGFzRXhhY3RFeHRlbnNpb24oZXh0ZW5zaW9uOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICBpZiAoZXh0ZW5zaW9uLnN0YXJ0c1dpdGgoXCIuXCIpKSB7XG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgYFRoZSBleHRlbnNpb24gcGFzc2VkIHRvIGhhc0V4dGVuc2lvbiBzaG91bGQgbm90IGhhdmUgYSBsZWFkaW5nICcuJ2BcbiAgICAgICk7XG4gICAgfVxuXG4gICAgbGV0IHtcbiAgICAgIGJhc2VuYW1lOiB7IGV4dCB9LFxuICAgIH0gPSBnZXRQYXJ0cyh0aGlzLiNmaWxlbmFtZSk7XG5cbiAgICByZXR1cm4gZXh0ID09PSBleHRlbnNpb247XG4gIH1cblxuICBhc3luYyBnbG9iKHNlYXJjaDogU2VhcmNoKTogUHJvbWlzZTxBYnNvbHV0ZVBhdGhzPjtcbiAgYXN5bmMgZ2xvYihnbG9iOiBzdHJpbmcsIHNlYXJjaD86IFNlYXJjaCk6IFByb21pc2U8QWJzb2x1dGVQYXRocz47XG4gIGFzeW5jIGdsb2IoKTogUHJvbWlzZTxBYnNvbHV0ZVBhdGhzPjtcbiAgYXN5bmMgZ2xvYihcbiAgICAuLi5hcmdzOiBbc2VhcmNoOiBTZWFyY2hdIHwgW2dsb2I6IHN0cmluZywgc2VhcmNoPzogU2VhcmNoXSB8IFtdXG4gICk6IFByb21pc2U8QWJzb2x1dGVQYXRocz4ge1xuICAgIGxldCBnbG9iOiBzdHJpbmcgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gICAgbGV0IHNlYXJjaDogU2VhcmNoIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuXG4gICAgaWYgKGFyZ3MubGVuZ3RoICE9PSAwKSB7XG4gICAgICBpZiAodHlwZW9mIGFyZ3NbMF0gPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgW2dsb2IsIHNlYXJjaF0gPSBhcmdzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgW3NlYXJjaF0gPSBhcmdzO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLiNraW5kID09PSBcInJlZ3VsYXJcIikge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIGBZb3UgY2Fubm90IGV4ZWN1dGUgYSBnbG9iIGluc2lkZSBhIHJlZ3VsYXIgZmlsZSAoZmlsZT0ke1xuICAgICAgICAgIHRoaXMuI2ZpbGVuYW1lXG4gICAgICAgIH0sIGdsb2I9JHtnbG9ifSwgc2VhcmNoPSR7c2VhcmNoPy5raW5kID8/IFwicmVndWxhclwifSlgXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBBYnNvbHV0ZVBhdGhzLmdsb2IoZ2xvYiA/PyBcIioqXCIsIHRoaXMsIHNlYXJjaCk7XG4gIH1cblxuICBmaWxlKC4uLnJlbGF0aXZlUGF0aDogcmVhZG9ubHkgc3RyaW5nW10pOiBBYnNvbHV0ZVBhdGgge1xuICAgIGlmICh0aGlzLiNraW5kID09PSBcInJlZ3VsYXJcIikge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIGBDYW5ub3QgY3JlYXRlIGEgbmVzdGVkIGZpbGUgaW5zaWRlIGEgcmVndWxhciBmaWxlIChwYXJlbnQ9JHtcbiAgICAgICAgICB0aGlzLiNmaWxlbmFtZVxuICAgICAgICB9LCBjaGlsZD0ke3BhdGguam9pbiguLi5yZWxhdGl2ZVBhdGgpfSlgXG4gICAgICApO1xuICAgIH1cblxuICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKGBbRklMRV1gLCB7XG4gICAgICByZXNvbHZlZDogcGF0aC5yZXNvbHZlKHRoaXMuI2ZpbGVuYW1lLCAuLi5yZWxhdGl2ZVBhdGgpLFxuICAgICAgcGF0aDogQWJzb2x1dGVQYXRoLmZpbGUocGF0aC5yZXNvbHZlKHRoaXMuI2ZpbGVuYW1lLCAuLi5yZWxhdGl2ZVBhdGgpKSxcbiAgICB9KTtcblxuICAgIHJldHVybiBBYnNvbHV0ZVBhdGguZmlsZShwYXRoLnJlc29sdmUodGhpcy4jZmlsZW5hbWUsIC4uLnJlbGF0aXZlUGF0aCkpO1xuICB9XG5cbiAgZGlyZWN0b3J5KC4uLnJlbGF0aXZlUGF0aDogcmVhZG9ubHkgc3RyaW5nW10pOiBBYnNvbHV0ZVBhdGgge1xuICAgIGlmICh0aGlzLiNraW5kID09PSBcInJlZ3VsYXJcIikge1xuICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgIGBDYW5ub3QgY3JlYXRlIGEgbmVzdGVkIGRpcmVjdG9yeSBpbnNpZGUgYSByZWd1bGFyIGZpbGUgKHBhcmVudD0ke1xuICAgICAgICAgIHRoaXMuI2ZpbGVuYW1lXG4gICAgICAgIH0sIGNoaWxkPSR7cGF0aC5qb2luKC4uLnJlbGF0aXZlUGF0aCl9KWBcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIEFic29sdXRlUGF0aC5kaXJlY3RvcnkoXG4gICAgICBwYXRoLnJlc29sdmUodGhpcy4jZmlsZW5hbWUsIC4uLnJlbGF0aXZlUGF0aClcbiAgICApO1xuICB9XG5cbiAgcmVsYXRpdmVGcm9tQW5jZXN0b3IoYW5jZXN0b3I6IEFic29sdXRlUGF0aCkge1xuICAgIGlmICghYW5jZXN0b3IuY29udGFpbnModGhpcykpIHtcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICBgQ2Fubm90IGNvbXB1dGUgYSByZWxhdGl2ZSBwYXRoIGZyb20gJHthbmNlc3Rvci4jZmlsZW5hbWV9IHRvICR7XG4gICAgICAgICAgdGhpcy4jZmlsZW5hbWVcbiAgICAgICAgfSwgYmVjYXVzZSBpdCBpcyBub3QgYW4gYW5jZXN0b3JgXG4gICAgICApO1xuICAgIH1cblxuICAgIHJldHVybiBwYXRoLnJlbGF0aXZlKGFuY2VzdG9yLiNmaWxlbmFtZSwgdGhpcy4jZmlsZW5hbWUpO1xuICB9XG5cbiAgY29udGFpbnMobWF5YmVDaGlsZDogQWJzb2x1dGVQYXRoKTogYm9vbGVhbiB7XG4gICAgbGV0IHJlbGF0aXZlID0gcGF0aC5yZWxhdGl2ZSh0aGlzLiNmaWxlbmFtZSwgbWF5YmVDaGlsZC4jZmlsZW5hbWUpO1xuXG4gICAgcmV0dXJuICFyZWxhdGl2ZS5zdGFydHNXaXRoKFwiLlwiKTtcbiAgfVxuXG4gIGVxKG90aGVyOiBBYnNvbHV0ZVBhdGgpIHtcbiAgICByZXR1cm4gdGhpcy4jZmlsZW5hbWUgPT09IG90aGVyLiNmaWxlbmFtZTtcbiAgfVxuXG4gIFtJTlNQRUNUXShjb250ZXh0OiBudWxsLCB7IHN0eWxpemUgfTogdXRpbC5JbnNwZWN0T3B0aW9uc1N0eWxpemVkKSB7XG4gICAgcmV0dXJuIGAke3N0eWxpemUoXCJQYXRoXCIsIFwic3BlY2lhbFwiKX0oJHtzdHlsaXplKFxuICAgICAgdGhpcy4jZmlsZW5hbWUsXG4gICAgICBcIm1vZHVsZVwiXG4gICAgKX0pYDtcbiAgfVxufVxuXG5jbGFzcyBQcmVwYXJlVHJhbnNwaWxhdGlvbiB7XG4gIHN0YXRpYyBjcmVhdGUoXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIGRpZmY6IFBhdGhEaWZmQnlLaW5kLFxuICAgIGRpZ2VzdHM6IFBhdGhEaWZmXG4gICk6IFByZXBhcmVUcmFuc3BpbGF0aW9uIHtcbiAgICByZXR1cm4gbmV3IFByZXBhcmVUcmFuc3BpbGF0aW9uKG5hbWUsIGRpZmYsIGRpZ2VzdHMpO1xuICB9XG5cbiAgcmVhZG9ubHkgI25hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgI2RpZmY6IFBhdGhEaWZmQnlLaW5kO1xuICByZWFkb25seSAjZGlnZXN0czogUGF0aERpZmY7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIGRpZmY6IFBhdGhEaWZmQnlLaW5kLCBkaWdlc3RzOiBQYXRoRGlmZikge1xuICAgIHRoaXMuI25hbWUgPSBuYW1lO1xuICAgIHRoaXMuI2RpZmYgPSBkaWZmO1xuICAgIHRoaXMuI2RpZ2VzdHMgPSBkaWdlc3RzO1xuICB9XG5cbiAgYXN5bmMgcnVuKHsgZHJ5UnVuIH06IHsgZHJ5UnVuOiBib29sZWFuIH0gPSB7IGRyeVJ1bjogZmFsc2UgfSkge1xuICAgIGxldCB7IGRpcmVjdG9yaWVzLCBmaWxlcyB9ID0gdGhpcy4jZGlmZjtcblxuICAgIGlmIChkcnlSdW4pIHtcbiAgICAgIGxvZ1xuICAgICAgICAubmV3bGluZSgpXG4gICAgICAgIC5sb2coXCJbRFJZLVJVTl1cIiwgdGhpcy4jbmFtZSlcbiAgICAgICAgLm5ld2xpbmUoKVxuICAgICAgICAuaGVhZGluZyhcIltEUlktUlVOXVwiLCBcIkRpcmVjdG9yaWVzXCIpO1xuXG4gICAgICBmb3IgKGxldCByZW1vdmVkIG9mIGRpcmVjdG9yaWVzLnJlbW92ZWQpIHtcbiAgICAgICAgbG9nLmluc3BlY3QubGFiZWxlZChcIiAgWy0tXVwiLCByZW1vdmVkKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChsZXQgYWRkZWQgb2YgZGlyZWN0b3JpZXMuYWRkZWQpIHtcbiAgICAgICAgbG9nLnNpbGVudC5pbnNwZWN0LmxhYmVsZWQoXCIgIFsrK11cIiwgYWRkZWQpO1xuICAgICAgfVxuXG4gICAgICBsb2cubmV3bGluZSgpLmhlYWRpbmcoXCJbRFJZLVJVTl1cIiwgXCJGaWxlc1wiKTtcblxuICAgICAgZm9yIChsZXQgcmVtb3ZlZCBvZiBmaWxlcy5yZW1vdmVkKSB7XG4gICAgICAgIGxvZy5pbnNwZWN0LmxhYmVsZWQoXCIgIFstLV1cIiwgcmVtb3ZlZCk7XG4gICAgICB9XG5cbiAgICAgIGZvciAobGV0IGFkZGVkIG9mIGZpbGVzLmFkZGVkKSB7XG4gICAgICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKFwiICBbKytdXCIsIGFkZGVkKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChsZXQgcmVtb3ZlZCBvZiBkaXJlY3Rvcmllcy5yZW1vdmVkKSB7XG4gICAgICAgIGxvZy5pbnNwZWN0LmxhYmVsZWQoXCJbLS1dXCIsIHJlbW92ZWQpO1xuICAgICAgICBzaGVsbC5ybShcIi1yXCIsIEFic29sdXRlUGF0aC5nZXRGaWxlbmFtZShyZW1vdmVkKSk7XG4gICAgICB9XG5cbiAgICAgIGZvciAobGV0IGRpcmVjdG9yeSBvZiBkaXJlY3Rvcmllcy5hZGRlZCkge1xuICAgICAgICBsb2cuaW5zcGVjdC5sYWJlbGVkKFwiWysrXVwiLCBkaXJlY3RvcnkpO1xuICAgICAgICBzaGVsbC5ta2RpcihcIi1wXCIsIEFic29sdXRlUGF0aC5nZXRGaWxlbmFtZShkaXJlY3RvcnkpKTtcbiAgICAgIH1cblxuICAgICAgZm9yIChsZXQgcmVtb3ZlZCBvZiBmaWxlcy5yZW1vdmVkKSB7XG4gICAgICAgIGxvZy5pbnNwZWN0LmxhYmVsZWQoXCIgIFstLV1cIiwgcmVtb3ZlZCk7XG4gICAgICAgIHNoZWxsLnJtKEFic29sdXRlUGF0aC5nZXRGaWxlbmFtZShyZW1vdmVkKSk7XG4gICAgICB9XG5cbiAgICAgIGZvciAobGV0IHJlbW92ZWQgb2YgdGhpcy4jZGlnZXN0cy5yZW1vdmVkKSB7XG4gICAgICAgIGxvZy5pbnNwZWN0LmxhYmVsZWQoXCIgIFstLV1cIiwgcmVtb3ZlZCk7XG4gICAgICAgIHNoZWxsLnJtKEFic29sdXRlUGF0aC5nZXRGaWxlbmFtZShyZW1vdmVkKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIFRyYW5zcGlsZVRhc2sge1xuICBzdGF0aWMgY3JlYXRlKFxuICAgIGlucHV0OiBBYnNvbHV0ZVBhdGgsXG4gICAgb3V0cHV0OiBBYnNvbHV0ZVBhdGgsXG4gICAgZGlnZXN0OiBBYnNvbHV0ZVBhdGhcbiAgKTogVHJhbnNwaWxlVGFzayB7XG4gICAgcmV0dXJuIG5ldyBUcmFuc3BpbGVUYXNrKGlucHV0LCBvdXRwdXQsIGRpZ2VzdCk7XG4gIH1cblxuICByZWFkb25seSAjZGlnZXN0OiBBYnNvbHV0ZVBhdGg7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICByZWFkb25seSBpbnB1dDogQWJzb2x1dGVQYXRoLFxuICAgIHJlYWRvbmx5IG91dHB1dDogQWJzb2x1dGVQYXRoLFxuICAgIGRpZ2VzdDogQWJzb2x1dGVQYXRoXG4gICkge1xuICAgIHRoaXMuI2RpZ2VzdCA9IGRpZ2VzdDtcbiAgfVxuXG4gIGFzeW5jICNkaWdlc3RzKCk6IFByb21pc2U8eyBwcmV2OiBzdHJpbmcgfCBudWxsOyBuZXh0OiBzdHJpbmcgfT4ge1xuICAgIGxldCBwcmV2ID0gYXdhaXQgdGhpcy4jZGlnZXN0LnJlYWQoKTtcbiAgICBsZXQgaW5wdXQgPSBhd2FpdCB0aGlzLmlucHV0LnJlYWQoKTtcblxuICAgIGlmIChpbnB1dCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgRXJyb3IoYFVuYWJsZSB0byByZWFkICR7QWJzb2x1dGVQYXRoLmdldEZpbGVuYW1lKHRoaXMuaW5wdXQpfWApO1xuICAgIH1cblxuICAgIGxldCBuZXh0ID0gZGlnZXN0KGlucHV0KTtcblxuICAgIHJldHVybiB7IHByZXYsIG5leHQgfTtcbiAgICAvLyBsZXQgbmV4dFxuICB9XG5cbiAgYXN5bmMgdHJhbnNwaWxlKCkge1xuICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKFwiW1RSQU5TUElMRS1UQVNLXVwiLCB7XG4gICAgICBpbnB1dDogdGhpcy5pbnB1dCxcbiAgICAgIG91dHB1dDogdGhpcy5vdXRwdXQsXG4gICAgICBkaWdlc3Q6IHRoaXMuI2RpZ2VzdCxcbiAgICB9KTtcblxuICAgIGxldCBkaWdlc3RzID0gYXdhaXQgdGhpcy4jZGlnZXN0cygpO1xuXG4gICAgaWYgKGRpZ2VzdHMucHJldiA9PT0gZGlnZXN0cy5uZXh0KSB7XG4gICAgICBsb2cuc2lsZW50Lmluc3BlY3QubGFiZWxlZChcIltGUkVTSF1cIiwgdGhpcy5pbnB1dCk7XG4gICAgICByZXR1cm47XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5pbnNwZWN0LmxhYmVsZWQoXCJbU1RBTEVdXCIsIHRoaXMuaW5wdXQpO1xuICAgIH1cblxuICAgIGxldCBvdXRwdXQgPSBzd2MudHJhbnNmb3JtRmlsZVN5bmMoQWJzb2x1dGVQYXRoLmdldEZpbGVuYW1lKHRoaXMuaW5wdXQpLCB7XG4gICAgICBzb3VyY2VNYXBzOiBcImlubGluZVwiLFxuICAgICAgaW5saW5lU291cmNlc0NvbnRlbnQ6IHRydWUsXG4gICAgICBqc2M6IHtcbiAgICAgICAgcGFyc2VyOiB7XG4gICAgICAgICAgc3ludGF4OiBcInR5cGVzY3JpcHRcIixcbiAgICAgICAgICBkZWNvcmF0b3JzOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICB0YXJnZXQ6IFwiZXMyMDIyXCIsXG4gICAgICB9LFxuICAgICAgb3V0cHV0UGF0aDogQWJzb2x1dGVQYXRoLmdldEZpbGVuYW1lKHRoaXMub3V0cHV0KSxcbiAgICB9KTtcblxuICAgIGxvZy5zaWxlbnQuaW5zcGVjdC5sYWJlbGVkKFwiW1dSSVRJTkddXCIsIHtcbiAgICAgIGZpbGU6IHRoaXMub3V0cHV0LFxuICAgICAgY29kZTogb3V0cHV0LmNvZGUsXG4gICAgfSk7XG5cbiAgICBhd2FpdCBmcy53cml0ZUZpbGUoQWJzb2x1dGVQYXRoLmdldEZpbGVuYW1lKHRoaXMuI2RpZ2VzdCksIGRpZ2VzdHMubmV4dCwge1xuICAgICAgZW5jb2Rpbmc6IFwidXRmLThcIixcbiAgICB9KTtcbiAgICBhd2FpdCBmcy53cml0ZUZpbGUoQWJzb2x1dGVQYXRoLmdldEZpbGVuYW1lKHRoaXMub3V0cHV0KSwgb3V0cHV0LmNvZGUpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHdvcmtzcGFjZVBhY2thZ2VzKHJvb3Q6IHN0cmluZywgZmlsdGVyOiBzdHJpbmcpIHtcbiAgbGV0IHN0ZG91dCA9IGF3YWl0IGV4ZWMoXG4gICAgc2hgcG5wbSBtIGxzIC0tZmlsdGVyIC4vJHtmaWx0ZXJ9IC0tZGVwdGggLTEgLS1wb3JjZWxhaW5gXG4gICk7XG5cbiAgaWYgKHN0ZG91dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgcmV0dXJuIHN0ZG91dFxuICAgIC5zcGxpdChcIlxcblwiKVxuICAgIC5maWx0ZXIoKGZpbGUpID0+IGZpbGUgIT09IFwiXCIgJiYgZmlsZSAhPT0gcm9vdClcbiAgICAubWFwKChwKSA9PiBwYXRoLnJlbGF0aXZlKHJvb3QsIHApKTtcbn1cblxuaW50ZXJmYWNlIEV4ZWNFcnJvck9wdGlvbnMgZXh0ZW5kcyBFcnJvck9wdGlvbnMge1xuICBjb2RlOiBudW1iZXIgfCBudWxsO1xuICBjb21tYW5kOiBzdHJpbmc7XG59XG5cbmNsYXNzIEV4ZWNFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgcmVhZG9ubHkgI2NvZGU6IG51bWJlciB8IG51bGw7XG4gIHJlYWRvbmx5ICNjb21tYW5kOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nLCBvcHRpb25zOiBFeGVjRXJyb3JPcHRpb25zKSB7XG4gICAgc3VwZXIobWVzc2FnZSwgb3B0aW9ucyk7XG5cbiAgICB0aGlzLiNjb2RlID0gb3B0aW9ucy5jb2RlO1xuICAgIHRoaXMuI2NvbW1hbmQgPSBvcHRpb25zLmNvbW1hbmQ7XG5cbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKTtcbiAgfVxuXG4gIGdldCBjb2RlKCk6IG51bWJlciB8IFwidW5rbm93blwiIHtcbiAgICByZXR1cm4gdGhpcy4jY29kZSA/PyBcInVua25vd25cIjtcbiAgfVxuXG4gIGdldCBtZXNzYWdlKCk6IHN0cmluZyB7XG4gICAgbGV0IG1lc3NhZ2UgPSBzdXBlci5tZXNzYWdlO1xuICAgIGxldCBoZWFkZXIgPSBgRXhlYyBGYWlsZWQgd2l0aCBjb2RlPSR7dGhpcy5jb2RlfVxcbiAgKGluICR7dGhpcy4jY29tbWFuZH0pYDtcblxuICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICByZXR1cm4gYCR7aGVhZGVyfVxcblxcbiR7bWVzc2FnZX1gO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaGVhZGVyO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBleGVjKGNvbW1hbmQ6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgoZnVsZmlsbCwgcmVqZWN0KSA9PiB7XG4gICAgbGV0IGNoaWxkID0gc2hlbGwuZXhlYyhjb21tYW5kLCB7IHNpbGVudDogdHJ1ZSwgYXN5bmM6IHRydWUgfSk7XG5cbiAgICBsZXQgc3Rkb3V0ID0gcmVhZEFsbChjaGlsZC5zdGRvdXQpO1xuICAgIGxldCBzdGRlcnIgPSByZWFkQWxsKGNoaWxkLnN0ZGVycik7XG5cbiAgICBjaGlsZC5vbihcImVycm9yXCIsIChlcnIpID0+IHJlamVjdChlcnIpKTtcbiAgICBjaGlsZC5vbihcImV4aXRcIiwgYXN5bmMgKGNvZGUpID0+IHtcbiAgICAgIGxvZy5zaWxlbnQoXCJleGVjIHN0YXR1c1wiLCB7IGNvZGUsIHN0ZG91dDogYXdhaXQgc3Rkb3V0IH0pO1xuXG4gICAgICBpZiAoY29kZSA9PT0gMCkge1xuICAgICAgICBmdWxmaWxsKGF3YWl0IHN0ZG91dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2coXCJleGVjIGVycm9yXCIsIHtcbiAgICAgICAgICBlcnJvcjogYXdhaXQgc3RkZXJyLFxuICAgICAgICAgIG91dDogYXdhaXQgc3Rkb3V0LFxuICAgICAgICAgIGNvZGUsXG4gICAgICAgICAgY29tbWFuZCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJlamVjdChuZXcgRXhlY0Vycm9yKChhd2FpdCBzdGRlcnIpID8/IFwiXCIsIHsgY29kZSwgY29tbWFuZCB9KSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufVxuXG5pbnRlcmZhY2UgUmVhZGFibGVTdHJlYW0gZXh0ZW5kcyBOb2RlSlMuUmVhZGFibGVTdHJlYW0ge1xuICBjbG9zZWQ/OiBib29sZWFuO1xuICBkZXN0cm95ZWQ/OiBib29sZWFuO1xuICBkZXN0cm95PygpOiB2b2lkO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZWFkQWxsKFxuICByZWFkYWJsZT86IFJlYWRhYmxlU3RyZWFtIHwgbnVsbFxuKTogUHJvbWlzZTxzdHJpbmcgfCB1bmRlZmluZWQ+IHtcbiAgaWYgKHJlYWRhYmxlID09PSB1bmRlZmluZWQgfHwgcmVhZGFibGUgPT09IG51bGwpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBsZXQgcmVzdWx0ID0gYXdhaXQgbmV3IFByb21pc2VSZWFkYWJsZShyZWFkYWJsZSkucmVhZEFsbCgpO1xuXG4gIGlmIChyZXN1bHQgPT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHJlc3VsdCA9PT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHJlc3VsdC50b1N0cmluZyhcInV0Zi04XCIpO1xuICB9XG59XG5cbmNvbnN0IFBBUlRTX01BVENIRVIgPSAvXig/PGZpbGU+W14uXSopKD86Wy5dKD88ZXh0Pi4qKSk/JC87XG5cbmludGVyZmFjZSBGaWxlUGFydHMge1xuICByZWFkb25seSBwYXJlbnQ6IHN0cmluZyB8IG51bGw7XG4gIHJlYWRvbmx5IGJhc2VuYW1lOiB7XG4gICAgcmVhZG9ubHkgZmlsZTogc3RyaW5nO1xuICAgIHJlYWRvbmx5IGV4dDogc3RyaW5nIHwgbnVsbDtcbiAgfTtcbiAgcmVhZG9ubHkga2luZD86IEFic29sdXRlUGF0aEtpbmQ7XG59XG5cbmZ1bmN0aW9uIGdldFBhcnRzKGZpbGVuYW1lOiBzdHJpbmcpOiBGaWxlUGFydHMge1xuICBsZXQgcGFyZW50ID0gZ2V0UGFyZW50KGZpbGVuYW1lKTtcbiAgbGV0IGJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlbmFtZSk7XG5cbiAgbGV0IGV4dGVuc2lvbiA9IGJhc2VuYW1lLm1hdGNoKFBBUlRTX01BVENIRVIpO1xuXG4gIGlmIChleHRlbnNpb24gPT09IG51bGwpIHtcbiAgICByZXR1cm4geyBwYXJlbnQsIGJhc2VuYW1lOiB7IGZpbGU6IGJhc2VuYW1lLCBleHQ6IG51bGwgfSB9O1xuICB9XG5cbiAgbGV0IHsgZmlsZSwgZXh0IH0gPSBleHRlbnNpb24uZ3JvdXBzITtcblxuICByZXR1cm4ge1xuICAgIHBhcmVudCxcbiAgICBiYXNlbmFtZTogeyBmaWxlLCBleHQgfSxcbiAgICBraW5kOiBwYXJlbnQgPT09IG51bGwgPyBcInJvb3RcIiA6IHVuZGVmaW5lZCxcbiAgfTtcblxuICAvLyBsZXQgWywgYmFzZW5hbWUsIGV4dG5hbWVdO1xufVxuXG5mdW5jdGlvbiBnZXRQYXJlbnQoZmlsZW5hbWU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBsZXQgcGFyZW50ID0gcGF0aC5kaXJuYW1lKGZpbGVuYW1lKTtcbiAgbGV0IHJvb3QgPSBwYXRoLnBhcnNlKHBhcmVudCkucm9vdDtcblxuICBpZiAoZmlsZW5hbWUgPT09IHJvb3QpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcGFyZW50O1xuICB9XG59XG5cbmZ1bmN0aW9uIGNoYW5nZUV4dGVuc2lvbihmaWxlOiBzdHJpbmcsIHRvOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBiYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZSwgcGF0aC5leHRuYW1lKGZpbGUpKTtcbiAgcmV0dXJuIHBhdGguam9pbihwYXRoLmRpcm5hbWUoZmlsZSksIGAke2Jhc2VuYW1lfS4ke3RvfWApO1xufVxuXG5mdW5jdGlvbiBleGhhdXN0aXZlKHZhbHVlOiBuZXZlciwgZGVzY3JpcHRpb246IHN0cmluZyk6IG5ldmVyIHtcbiAgdGhyb3cgRXJyb3IoYEV4cGVjdGVkICR7ZGVzY3JpcHRpb259IHRvIGJlIGV4aGF1c3RpdmVseSBjaGVja2VkYCk7XG59XG5cbmNvbnN0IExBQkVMID0gU3ltYm9sKFwiTEFCRUxcIik7XG50eXBlIExBQkVMID0gdHlwZW9mIExBQkVMO1xuXG5pbnRlcmZhY2UgTGFiZWwge1xuICByZWFkb25seSBbTEFCRUxdOiByZWFkb25seSBzdHJpbmdbXTtcbn1cblxuZnVuY3Rpb24gTGFiZWwoLi4ubGFiZWw6IHN0cmluZ1tdKTogTGFiZWwge1xuICByZXR1cm4geyBbTEFCRUxdOiBsYWJlbCB9O1xufVxuXG5mdW5jdGlvbiBpc0xhYmVsKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgTGFiZWwge1xuICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiICYmIHZhbHVlICE9PSBudWxsICYmIExBQkVMIGluIHZhbHVlO1xufVxuXG5pbnRlcmZhY2UgTG9nIHtcbiAgKHZhbHVlOiB1bmtub3duKTogTG9nO1xuICAobGFiZWw6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiBMb2c7XG4gIChsYWJlbDogdW5rbm93bik6IExvZztcblxuICByZWFkb25seSBsb2c6IExvZztcbiAgcmVhZG9ubHkgc2lsZW50OiBMb2c7XG5cbiAgbmV3bGluZSgpOiBMb2c7XG4gIGhlYWRpbmcoLi4ubGFiZWw6IHN0cmluZ1tdKTogTG9nO1xuXG4gIHJlYWRvbmx5IGluc3BlY3Q6IHtcbiAgICAodmFsdWU6IHVua25vd24sIG9wdGlvbnM/OiB1dGlsLkluc3BlY3RPcHRpb25zKTogTG9nO1xuICAgIGxhYmVsZWQoXG4gICAgICBsYWJlbDogc3RyaW5nIHwgTGFiZWwsXG4gICAgICB2YWx1ZTogdW5rbm93bixcbiAgICAgIG9wdGlvbnM/OiB1dGlsLkluc3BlY3RPcHRpb25zXG4gICAgKTogTG9nO1xuICB9O1xufVxuXG5jb25zdCBTSUxFTlQ6IExvZyA9ICgoKSA9PiB7XG4gIGNvbnN0IGxvZyA9ICguLi5hcmdzOiB1bmtub3duW10pOiBMb2cgPT4gU0lMRU5UO1xuICBsb2cubG9nID0gbG9nO1xuICBsb2cuc2lsZW50ID0gbG9nO1xuXG4gIGxvZy5uZXdsaW5lID0gKCkgPT4gbG9nO1xuICBsb2cuaGVhZGluZyA9ICguLi5sYWJlbDogc3RyaW5nW10pID0+IGxvZztcblxuICBjb25zdCBpbnNwZWN0ID0gKHZhbHVlOiB1bmtub3duLCBvcHRpb25zPzogdXRpbC5JbnNwZWN0T3B0aW9ucykgPT4gbG9nO1xuICBpbnNwZWN0LmxhYmVsZWQgPSAoLi4uYXJnczogdW5rbm93bltdKTogTG9nID0+IGxvZztcbiAgbG9nLmluc3BlY3QgPSBpbnNwZWN0O1xuXG4gIHJldHVybiBsb2c7XG59KSgpO1xuXG5mdW5jdGlvbiBsb2codmFsdWU6IHVua25vd24pOiBMb2c7XG5mdW5jdGlvbiBsb2cobGFiZWw6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiBMb2c7XG5mdW5jdGlvbiBsb2cobGFiZWw6IHVua25vd24pOiBMb2c7XG5mdW5jdGlvbiBsb2coXG4gIC4uLmFyZ3M6IFt2YWx1ZTogdW5rbm93bl0gfCBbbGFiZWw6IHN0cmluZywgdmFsdWU6IHVua25vd25dIHwgW0xhYmVsXVxuKTogTG9nIHtcbiAgaWYgKGFyZ3MubGVuZ3RoID09PSAyKSB7XG4gICAgbGV0IFtsYWJlbCwgdmFsdWVdID0gYXJncztcbiAgICBjb25zb2xlLmxvZyhsYWJlbCwgdXRpbC5pbnNwZWN0KHZhbHVlLCB7IGRlcHRoOiBudWxsLCBjb2xvcnM6IHRydWUgfSkpO1xuICB9IGVsc2Uge1xuICAgIGxldCBbdmFsdWVdID0gYXJncztcblxuICAgIGlmIChpc0xhYmVsKHZhbHVlKSkge1xuICAgICAgY29uc29sZS5sb2coLi4udmFsdWVbTEFCRUxdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2codXRpbC5pbnNwZWN0KHZhbHVlLCB7IGRlcHRoOiBudWxsLCBjb2xvcnM6IHRydWUgfSkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBsb2c7XG59XG5cbmxvZy5zaWxlbnQgPSBTSUxFTlQ7XG5sb2cubG9nID0gbG9nO1xuXG5sb2cubmV3bGluZSA9ICgpOiB0eXBlb2YgbG9nID0+IHtcbiAgY29uc29sZS5sb2coXCJcXG5cIik7XG4gIHJldHVybiBsb2c7XG59O1xuXG5sb2cuaGVhZGluZyA9ICguLi5sYWJlbDogc3RyaW5nW10pOiB0eXBlb2YgbG9nID0+IHtcbiAgY29uc29sZS5sb2coLi4ubGFiZWwpO1xuICByZXR1cm4gbG9nO1xufTtcblxuY29uc3QgbG9nTGFiZWxlZCA9IChcbiAgbGFiZWw6IHN0cmluZyB8IExhYmVsLFxuICB2YWx1ZTogdW5rbm93bixcbiAgb3B0aW9ucz86IHV0aWwuSW5zcGVjdE9wdGlvbnNcbik6IHR5cGVvZiBsb2cgPT4ge1xuICBsb2dMYWJlbGVkVmFsdWUobGFiZWwsIHZhbHVlLCBvcHRpb25zKTtcbiAgcmV0dXJuIGxvZztcbn07XG5cbmNvbnN0IGxvZ0luc3BlY3QgPSAoXG4gIHZhbHVlOiB1bmtub3duLFxuICBvcHRpb25zPzogdXRpbC5JbnNwZWN0T3B0aW9uc1xuKTogdHlwZW9mIGxvZyA9PiB7XG4gIGNvbnNvbGUubG9nKGluc3BlY3QodmFsdWUsIG9wdGlvbnMpKTtcbiAgcmV0dXJuIGxvZztcbn07XG5cbmxvZ0luc3BlY3QubGFiZWxlZCA9IGxvZ0xhYmVsZWQ7XG5cbmxvZy5pbnNwZWN0ID0gbG9nSW5zcGVjdDtcblxuZnVuY3Rpb24gbG9nTGFiZWxlZFZhbHVlKFxuICBsYWJlbDogc3RyaW5nIHwgTGFiZWwsXG4gIHZhbHVlOiB1bmtub3duLFxuICBvcHRpb25zOiB1dGlsLkluc3BlY3RPcHRpb25zID0ge31cbik6IHZvaWQge1xuICBpZiAoaXNMYWJlbChsYWJlbCkpIHtcbiAgICBjb25zb2xlLmxvZyguLi5sYWJlbFtMQUJFTF0sIGluc3BlY3QodmFsdWUsIG9wdGlvbnMpKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zb2xlLmxvZyhsYWJlbCwgaW5zcGVjdCh2YWx1ZSwgb3B0aW9ucykpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGluc3BlY3QodmFsdWU6IHVua25vd24sIG9wdGlvbnM6IHV0aWwuSW5zcGVjdE9wdGlvbnMgPSB7fSk6IHN0cmluZyB7XG4gIHJldHVybiB1dGlsLmluc3BlY3QodmFsdWUsIHsgLi4ub3B0aW9ucywgZGVwdGg6IG51bGwsIGNvbG9yczogdHJ1ZSB9KTtcbn1cblxuZnVuY3Rpb24gbG9nZ2VkPFQ+KHZhbHVlOiBULCBkZXNjcmlwdGlvbjogc3RyaW5nLCBzaG91bGRMb2cgPSB0cnVlKTogVCB7XG4gIGlmIChzaG91bGRMb2cpIHtcbiAgICBjb25zb2xlLmxvZyhcbiAgICAgIGRlc2NyaXB0aW9uLFxuICAgICAgXCI9XCIsXG4gICAgICB1dGlsLmluc3BlY3QodmFsdWUsIHsgZGVwdGg6IG51bGwsIGNvbG9yczogdHJ1ZSB9KVxuICAgICk7XG4gIH1cbiAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBkaWdlc3Qoc291cmNlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgaGFzaCA9IGNyZWF0ZUhhc2goXCJzaGEyNTZcIik7XG4gIGhhc2gudXBkYXRlKHNvdXJjZSk7XG4gIHJldHVybiBoYXNoLmRpZ2VzdChcImhleFwiKTtcbn1cbiJdfQ==