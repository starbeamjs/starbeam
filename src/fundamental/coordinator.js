import { exhaustive } from "../strippable/assert.js";
export var Priority;
(function (Priority) {
    Priority["BeforeLayout"] = "BeforeLayout";
    Priority["HighPriority"] = "HighPriority";
    Priority["Auto"] = "Auto";
    Priority["WhenIdle"] = "WhenIdle";
})(Priority = Priority || (Priority = {}));
export class Work {
    priority;
    work;
    static create(priority, work) {
        return new Work(priority, work);
    }
    constructor(priority, work) {
        this.priority = priority;
        this.work = work;
    }
}
class MicrotaskJob {
    static create() {
        return new MicrotaskJob(new Set());
    }
    #work;
    constructor(work) {
        this.#work = work;
    }
    add(work) {
        this.#work.add(work);
    }
    next() {
        return MicrotaskJob.create();
    }
    async schedule() {
        await Promise.resolve();
        for (let item of this.#work) {
            item();
        }
    }
}
class Queue {
    static create(createJob) {
        return new Queue(createJob, null, null);
    }
    #createJob;
    #job;
    #running;
    constructor(createJob, scheduled, running) {
        this.#createJob = createJob;
        this.#job = scheduled;
        this.#running = running;
    }
    /**
     * Construct a job on demand.
     */
    #getJob() {
        let job = this.#job;
        if (!job) {
            job = this.#job = this.#createJob();
        }
        return job;
    }
    /**
     * Add work to the current job. If no current job exists, one will be created.
     *
     * If the current job is not already scheduled, schedule it.
     */
    add(work) {
        let job = this.#getJob();
        job.add(work);
        if (this.#running) {
            return;
        }
        this.#running = this.#run(job);
    }
    async #run(job) {
        this.#job = job.next();
        await job.schedule();
    }
}
export class Coordinator {
    static create() {
        let queue = Queue.create(() => MicrotaskJob.create());
        return new Coordinator(queue, queue, queue, queue);
    }
    // This queue must run before the next paint (in a microtask checkpoint)
    #layout;
    // This queue can run after the microtask checkpoint, but should be prioritized
    #priority;
    // This queue should run in the task queue, using the browser's normal heuristics
    #normal;
    // This queue is low-priority and should run whenever there is idle time
    #idle;
    constructor(layout, priority, normal, idle) {
        this.#layout = layout;
        this.#priority = priority;
        this.#normal = normal;
        this.#idle = idle;
    }
    enqueue(...work) {
        for (let item of work) {
            switch (item.priority) {
                case Priority.BeforeLayout: {
                    this.#layout.add(item.work);
                    break;
                }
                case Priority.HighPriority: {
                    this.#priority.add(item.work);
                    break;
                }
                case Priority.Auto: {
                    this.#priority.add(item.work);
                    break;
                }
                case Priority.WhenIdle: {
                    this.#priority.add(item.work);
                    break;
                }
                default: {
                    exhaustive(item.priority, `item.priority`);
                }
            }
        }
    }
}
export const COORDINATOR = Coordinator.create();
//# sourceMappingURL=coordinator.js.map