import { exhaustive } from "../strippable/assert.js";

export enum Priority {
  BeforeLayout = "BeforeLayout",
  HighPriority = "HighPriority",
  Auto = "Auto",
  WhenIdle = "WhenIdle",
}

type Callback = () => void;

export class Work {
  static create(priority: Priority, work: Callback): Work {
    return new Work(priority, work);
  }

  private constructor(readonly priority: Priority, readonly work: Callback) {}
}

interface Job {
  add(work: Callback): void;
  next(): Job;
  schedule(): Promise<void>;
}

class MicrotaskJob implements Job {
  static create() {
    return new MicrotaskJob(new Set());
  }

  readonly #work: Set<Callback>;

  private constructor(work: Set<Callback>) {
    this.#work = work;
  }

  add(work: Callback) {
    this.#work.add(work);
  }

  next(): Job {
    return MicrotaskJob.create();
  }

  async schedule(): Promise<void> {
    await Promise.resolve();

    for (let item of this.#work) {
      item();
    }
  }
}

class Queue {
  static create(createJob: () => Job): Queue {
    return new Queue(createJob, null, null);
  }

  #createJob: () => Job;
  #job: Job | null;
  #running: Promise<void> | null;

  private constructor(
    createJob: () => Job,
    scheduled: Job | null,
    running: Promise<void> | null
  ) {
    this.#createJob = createJob;
    this.#job = scheduled;
    this.#running = running;
  }

  /**
   * Construct a job on demand.
   */
  #getJob(): Job {
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
  add(work: Callback): void {
    let job = this.#getJob();

    job.add(work);

    if (this.#running) {
      return;
    }

    this.#running = this.#run(job);
  }

  async #run(job: Job) {
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
  #layout: Queue;
  // This queue can run after the microtask checkpoint, but should be prioritized
  #priority: Queue;
  // This queue should run in the task queue, using the browser's normal heuristics
  #normal: Queue;
  // This queue is low-priority and should run whenever there is idle time
  #idle: Queue;

  private constructor(
    layout: Queue,
    priority: Queue,
    normal: Queue,
    idle: Queue
  ) {
    this.#layout = layout;
    this.#priority = priority;
    this.#normal = normal;
    this.#idle = idle;
  }

  enqueue(...work: Work[]) {
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
