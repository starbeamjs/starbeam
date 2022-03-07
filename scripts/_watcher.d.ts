interface LowLevelWatcher {
  on(event: "error", callback: (error: Error) => void): void;
  on(event: "ready", callback: () => void): void;
  on(event: "close", callback: () => void): void;
  on(
    event: "all",
    callback: (event: FsEvent, path: Path, pathNext: Path) => void
  ): void;
  on(event: "add", callback: (path: Path) => void): void;
  on(event: "addDir", callback: (path: Path) => void): void;
  on(event: "change", callback: (path: Path) => void): void;
  on(event: "rename", callback: (path: Path) => void): void;
  on(event: "renameDir", callback: (path: Path) => void): void;
  on(event: "unlink", callback: (path: Path) => void): void;
  on(event: "unlinkDir", callback: (path: Path) => void): void;
}

type WatcherEvent = "error" | "ready" | "close" | "all";

type FsEvent = "add" | "unlink";
type FileEvent = FsEvent | "change";

interface WatcherDelegate {
  error: (error: Error) => void;
  ready: () => void;
  close: () => void;
  all: (event: FsEvent, path: Path, pathNext: Path) => void;
}

interface FileDelegate {
  add: (path: Path) => void;
  change: (path: Path) => void;
  unlink: (path: Path) => void;
}

interface DirDelegate {
  add: (path: Path) => void;
  unlink: (path: Path) => void;
}

interface OnWatch {
  error: (error: Error) => void;
  ready: () => void;
  close: () => void;
  files: {
    add: (paths: Paths) => void;
    change: (paths: Paths) => void;
    unlink: (paths: Paths) => void;
  };
  dirs: {
    add: (paths: Paths) => void;
    unlink: (paths: Paths) => void;
  };
}

interface PartialOnWatch {
  error?: (error: Error) => void;
  ready?: () => void;
  close?: () => void;
  files?: {
    add?: (path: Path) => void;
    change?: (path: Path) => void;
    unlink?: (path: Path) => void;
  };
  dirs?: {
    add?: (path: Path) => void;
    unlink?: (path: Path) => void;
  };
}

declare class Watcher {
  on(delegate: PartialOnWatch): Watcher;
}

// const enum FileType {
//   DIR = 1,
//   FILE = 2,
// }

// const enum FSTargetEvent {
//   CHANGE = "change",
//   RENAME = "rename",
// }

// const enum FSWatcherEvent {
//   CHANGE = "change",
//   ERROR = "error",
// }

// const enum TargetEvent {
//   ADD = "add",
//   ADD_DIR = "addDir",
//   CHANGE = "change",
//   RENAME = "rename",
//   RENAME_DIR = "renameDir",
//   UNLINK = "unlink",
//   UNLINK_DIR = "unlinkDir",
// }

// const enum WatcherEvent {
//   ALL = "all",
//   CLOSE = "close",
//   ERROR = "error",
//   READY = "ready",
// }
