Error.stackTraceLimit = Infinity;
export const FRAMES_TO_REMOVE = 3;
const FRAME_START = "    at ";
export let CURRENT_FRAMES_TO_REMOVE = FRAMES_TO_REMOVE;
export class Abstraction {
    static default() {
        return new Abstraction(null);
    }
    static start() {
        return ABSTRACTION.#start(2);
    }
    static end(start, error) {
        return ABSTRACTION.#end(start, error);
    }
    static callerFrame(frames = 3) {
        let stack = Abstraction.#stack(frames);
        return stack.split("\n")[0].trimStart();
    }
    static #stack(frames = 1) {
        let abstraction = new Abstraction(frames);
        try {
            throw Error(`capturing stack`);
        }
        catch (e) {
            return parse(abstraction.#error(null, e)).stack;
        }
    }
    static #buildError(frames, message) {
        let start = ABSTRACTION.#start(frames);
        try {
            throw Error(message);
        }
        catch (e) {
            return ABSTRACTION.#error(start, e);
        }
    }
    static throw(message) {
        throw Abstraction.#buildError(2, message);
    }
    // static eraseFrame(callback: () => void): void {
    // }
    static not(callback, _frames) {
        callback();
    }
    static throws(callback, frames = 1) {
        let stack = Abstraction.#stack(frames);
        try {
            callback();
        }
        catch (e) {
            let header = parse(e).header;
            e.stack = `${header}\n${stack}`;
            throw e;
        }
    }
    static wrap(callback, frames = 2) {
        let start = ABSTRACTION.#start(frames);
        try {
            let result = callback();
            ABSTRACTION.#end(start);
            return result;
        }
        catch (e) {
            throw ABSTRACTION.#error(start, e);
        }
    }
    #currentFrames;
    constructor(currentFrames) {
        this.#currentFrames = currentFrames;
    }
    #start(frames) {
        let prev = this.#currentFrames;
        if (this.#currentFrames === null) {
            this.#currentFrames = frames + 1;
        }
        else {
            this.#currentFrames += frames;
        }
        return prev;
    }
    #end(prevFrames, error) {
        let filtered = this.#error(prevFrames, error);
        if (filtered) {
            throw filtered;
        }
    }
    #error(prevFrames, error) {
        // Only filter once, at the top
        if (prevFrames !== null) {
            return error;
        }
        let framesToFilter = this.#currentFrames;
        if (framesToFilter === null) {
            throw Error(`Unexpected: unbalanced start and end in Abstraction`);
        }
        this.#currentFrames = prevFrames;
        if (error) {
            return this.#filter(framesToFilter, error);
        }
    }
    #filter(currentFrames, error) {
        let filteredError = error;
        // console.log(`[FILTERING] ${currentFrames} frames`);
        // console.log(`[ORIGINAL] ${error.stack}`);
        if (error.stack === undefined) {
            throw Error(`Unexpected: missing error.stack`);
        }
        let lines = error.stack.split("\n");
        let removed = 0;
        let filtered = [];
        for (let line of lines) {
            if (!line.startsWith(FRAME_START)) {
                filtered.push(line);
            }
            else if (removed++ >= currentFrames) {
                filtered.push(line);
            }
        }
        filteredError.stack = filtered.join("\n");
        // console.log(`[FILTERED] ${filteredError.stack}`);
        return filteredError;
    }
}
const ABSTRACTION = Abstraction.default();
function parse(error) {
    let lines = error.stack.split("\n");
    let headerDone = false;
    let header = [];
    let stack = [];
    for (let line of lines) {
        if (headerDone) {
            stack.push(line);
        }
        else {
            if (line.startsWith(FRAME_START)) {
                headerDone = true;
                stack.push(line);
            }
            else {
                header.push(line);
            }
        }
    }
    return { header: header.join("\n"), stack: stack.join("\n") };
}
//# sourceMappingURL=abstraction.js.map