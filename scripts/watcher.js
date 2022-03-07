// @ts-check

/// <reference path="./_watcher.d.ts" />

const WATCHER_EVENTS = new Set(["all", "close", "error", "ready"]);

const FS_EVENTS = new Set([
  "add",
  "addDir",
  "change",
  "rename",
  "renameDir",
  "unlink",
  "unlinkDir",
]);

class Event {
  /** @readonly */
  event;

  /** @readonly */
  path;

  /**
   * @param {Path} path
   */
  constructor(path) {
    this.path = path;
  }
}

class Queue {
  #paths = Paths.empty();

  /** @param {Path} path */
  add(path) {
    this.#paths.add(path);
  }
}

export class Watcher {
  #watcher;

  /**
   * @type {Set<PartialOnWatch>}
   */
  #delegates = new Set();

  #queue = {};

  constructor(/** @type {LowLevelWatcher} */ watcher) {
    this.#watcher = watcher;

    watcher.on("all", (event, targetPath, targetPathNext) => {
      switch (event) {
        case "add": {
        }
      }
    });
  }

  /**
   *
   * @param {PartialOnWatch} delegate
   */
  on(delegate) {
    this.#delegates.add(delegate);

    return () => this.#delegates.delete(delegate);
  }
}
