import WatcherClass, { type as WatcherType } from "watcher";
import { Package, workspacePackageNames } from "./compile.js";
import type { AbsolutePath } from "./paths.js";

type Watcher = WatcherType;
const Watcher = WatcherClass;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonArray
  | JsonObject;
export type JsonArray = readonly JsonValue[];
export type JsonObject = { [P in string]: JsonValue };

export interface WorkspaceDetails {
  /**
   * The root of the workspace (containing the root package.json)
   */
  readonly root: AbsolutePath;
  /**
   * The namespace that represents the workspace (i.e. @starbeam if the
   * workspace's packages are @starbeam/*)
   */
  readonly namespace: string;

  /**
   * A hash of environmental details that are not otherwise captured. You can
   * also change this value to force a rebuild.
   */
  readonly hash: string;
}

export class Workspace {
  static async create(workspace: WorkspaceDetails) {
    const packageNames = await workspacePackageNames(workspace);

    const packages = await Promise.all(
      packageNames.map(async (localName) => {
        const packageRoot = workspace.root.directory(
          workspace.namespace,
          localName
        );
        const manifest = packageRoot.file("package.json");
        const body = await manifest.read();

        const packageJSON: JsonObject = body ? JSON.parse(body) : {};

        return Package.create(
          workspace,
          localName,
          await PackageState.create(
            workspace,
            packageRoot,
            localName,
            packageJSON
          )
        );
      })
    );

    return new Workspace(workspace, packages);
  }

  /**
   * The npm namespace (e.g. the #namespace of `@starbeam/core` is `@starbeam`)
   */
  readonly #details: WorkspaceDetails;
  readonly #packages: readonly Package[];
  readonly #state: WorkspaceState | undefined;

  private constructor(
    details: WorkspaceDetails,
    packages: readonly Package[],
    state?: WorkspaceState
  ) {
    this.#details = details;
    this.#packages = packages;
    this.#state = state; //?? WorkspaceState.create(this);
  }

  get root(): AbsolutePath {
    return this.#details.root;
  }

  get packages(): readonly Package[] {
    return this.#packages;
  }

  get namespace(): string {
    return this.#details.namespace;
  }
}

export class WorkspaceWatcher {
  static async create(workspace: Workspace): Promise<WorkspaceWatcher> {
    let watcher = new Watcher();

    return new WorkspaceWatcher(workspace, watcher);
  }

  #workspace: Workspace;
  #watcher: Watcher;

  private constructor(workspace: Workspace, watcher: Watcher) {
    this.#workspace = workspace;
    this.#watcher = watcher;
  }
}

export class WorkspaceState {
  static create(_workspace: Workspace): WorkspaceState {
    throw Error("todo: WorkspaceState.create");
  }

  // @ts-expect-error TODO: WorkspaceState
  readonly #packages: Map<string, PackageState>;
}

export class PackageState {
  static async create(
    workspace: WorkspaceDetails,
    packageRoot: AbsolutePath,
    localName: string,
    manifest: JsonObject
  ) {
    return new PackageState(
      workspace,
      packageRoot,
      localName,
      new Map(),
      manifest
    );
  }

  /**
   * The parsed package.json for the package
   */
  readonly #workspace: WorkspaceDetails;
  readonly #root: AbsolutePath;
  readonly #localName: string;
  readonly #entries: Map<string, PackageEntryState>;
  #manifest: JsonObject;

  private constructor(
    workspace: WorkspaceDetails,
    root: AbsolutePath,
    localName: string,
    entries: Map<string, PackageEntryState>,
    manifest: JsonObject
  ) {
    this.#workspace = workspace;
    this.#root = root;
    this.#localName = localName;
    this.#entries = entries;
    this.#manifest = manifest;
  }

  get name(): string {
    return `${this.#workspace.namespace}/${this.#localName}`;
  }

  get hash(): string {
    return this.#workspace.hash;
  }
}

export class PackageEntryState {}

export async function createPackage(
  workspace: WorkspaceDetails,
  localName: string,
  manifest: JsonObject
): Promise<Package> {
  let packageRoot = workspace.root.directory(workspace.namespace, localName);
  let state = await PackageState.create(
    workspace,
    packageRoot,
    localName,
    manifest
  );

  return Package.create(workspace, localName, state);
}
