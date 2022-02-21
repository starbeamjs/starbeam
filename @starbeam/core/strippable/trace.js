import { CONFIG } from "../fundamental/config.js";
import { assert } from "./core.js";
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["Trace"] = 1] = "Trace";
    LogLevel[LogLevel["Debug"] = 2] = "Debug";
    LogLevel[LogLevel["Info"] = 4] = "Info";
    LogLevel[LogLevel["Warn"] = 8] = "Warn";
    LogLevel[LogLevel["Error"] = 16] = "Error";
    LogLevel[LogLevel["Bug"] = 32] = "Bug";
    LogLevel[LogLevel["Silent"] = 64] = "Silent";
})(LogLevel = LogLevel || (LogLevel = {}));
export class Group {
    static start(console, label, shouldLog) {
        return new Group(console, label, shouldLog, false);
    }
    #console;
    #label;
    #shouldLog;
    #started;
    constructor(console, label, shouldLog, started) {
        this.#console = console;
        this.#label = label;
        this.#shouldLog = shouldLog;
        this.#started = started;
    }
    collapsed(callback) {
        this.#started = true;
        if (!this.#shouldLog) {
            if (callback) {
                return callback();
            }
            else {
                return this;
            }
        }
        this.#console.groupCollapsed(this.#label);
        if (callback) {
            try {
                return callback();
            }
            finally {
                this.#console.groupEnd();
            }
        }
        else {
            return this;
        }
    }
    expanded() {
        this.#started = true;
        if (this.#shouldLog) {
            this.#console.group(this.#label);
        }
        return this;
    }
    end() {
        assert(this.#started, `You must call group.expanded() or group.collapsed() before group.end()`);
        if (this.#shouldLog) {
            this.#console.groupEnd();
        }
    }
}
function logLevelFrom(level, from) {
    if (level === undefined) {
        return undefined;
    }
    else {
        switch (level.toLowerCase()) {
            case "trace":
                return LogLevel.Trace;
            case "debug":
                return LogLevel.Debug;
            case "info":
                return LogLevel.Info;
            case "warn":
                return LogLevel.Warn;
            case "error":
                return LogLevel.Error;
            case "bug":
                return LogLevel.Bug;
            case "silent":
                return LogLevel.Silent;
            default:
                console.warn(`unexpected value for ${from} (${JSON.stringify(level)}). Expected one of: trace, debug, info, warn, error, bug, silent.`);
                return undefined;
        }
    }
}
const DEFAULT_LEVEL = LogLevel.Warn;
export class Logger {
    static default() {
        let console = () => globalThis.console;
        return new Logger(console, undefined, LogLevel.Info, false);
    }
    static create(console, level = DEFAULT_LEVEL, as = LogLevel.Info) {
        return new Logger(() => console, level, as, false);
    }
    #specifiedLevel;
    #as;
    #withStack;
    #console;
    // readonly trace: Logger;
    // readonly debug: Logger;
    // readonly info: Logger;
    // readonly warn: Logger;
    // readonly error: Logger;
    // readonly bug: Logger;
    constructor(console, specifiedLevel, as, withStack) {
        this.#console = console;
        this.#specifiedLevel = specifiedLevel;
        this.#as = as;
        this.#withStack = withStack;
        // this.trace = new Logger(this.#console, this.#level, LogLevel.Trace);
        // this.debug = new Logger(this.#console, this.#level, LogLevel.Debug);
        // this.info = new Logger(this.#console, this.#level, LogLevel.Trace);
        // this.warn = new Logger(this.#console, this.#level, LogLevel.Warn);
        // this.error = new Logger(this.#console, this.#level, LogLevel.Error);
        // this.bug = new Logger(this.#console, this.#level, LogLevel.Bug);
    }
    get #level() {
        if (this.#specifiedLevel) {
            return this.#specifiedLevel;
        }
        else {
            return currentLevel();
        }
    }
    get trace() {
        return new Logger(this.#console, this.#specifiedLevel, LogLevel.Trace, this.#withStack);
    }
    get warn() {
        return new Logger(this.#console, this.#specifiedLevel, LogLevel.Warn, this.#withStack);
    }
    get withStack() {
        return new Logger(this.#console, this.#specifiedLevel, this.#as, true);
    }
    get #shouldLog() {
        return this.#as >= this.#level;
    }
    log(...args) {
        if (this.#shouldLog) {
            if (this.#withStack) {
                this.#console().trace(...args);
            }
            else {
                this.#console().log(...args);
            }
        }
    }
    group(description, callback) {
        if (!this.#shouldLog) {
            if (callback) {
                return callback();
            }
            else {
                return Group.start(this.#console(), description, this.#shouldLog);
            }
        }
        if (callback) {
            this.#console().group(description);
            if (this.#withStack) {
                console.trace("logged at");
            }
            try {
                return callback();
            }
            finally {
                this.#console().groupEnd();
            }
        }
        else {
            return Group.start(this.#console(), description, this.#shouldLog);
        }
    }
}
function currentLevel() {
    return (logLevelFrom(CONFIG.get("LogLevel"), CONFIG.describe("LogLevel")) ??
        DEFAULT_LEVEL);
}
/**
 * @strip.statement
 */
export const LOGGER = Logger.default();
//# sourceMappingURL=trace.js.map