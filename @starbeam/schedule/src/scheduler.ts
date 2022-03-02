import { Priority } from "@starbeam/config";
import { assert } from "@starbeam/debug";
import { exhaustive } from "@starbeam/verify";

type Callback = () => void;

export class Work {
  static create(priority: Priority, work: Callback): Work {
    return new Work(priority, work);
  }

  private constructor(readonly priority: Priority, readonly work: Callback) {}
}

interface Job {
  commit(): void;
  add(work: Callback): void;
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

  commit(): void {
    // noop
  }

  add(work: Callback) {
    this.#work.add(work);
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
    return new Queue(createJob, null, false);
  }

  #createJob: () => Job;
  #job: Job | null;
  #running: boolean;

  private constructor(
    createJob: () => Job,
    scheduled: Job | null,
    running: boolean
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

    if (!this.#running) {
      this.#run();
    }
  }

  async #run() {
    this.#running = true;

    try {
      while (this.#job) {
        let job = this.#job;
        this.#job = null;
        await job.schedule();
      }
    } finally {
      this.#running = false;
    }
  }
}

class InlineQueue {
  static create(): InlineQueue {
    return new InlineQueue(new Set(), 0);
  }

  #beginCount: number;
  #work: Set<Callback>;

  private constructor(work: Set<Callback>, beginCount: number) {
    this.#work = work;
    this.#beginCount = beginCount;
  }

  add(work: Callback): void {
    assert(
      this.#beginCount > 0,
      `You cannot enqueue work with the coordinator without first calling begin()`
    );

    this.#work.add(work);
  }

  begin(): void {
    this.#beginCount++;
  }

  commit(): any {
    assert(
      this.#beginCount > 0,
      `You called commit() without first calling begin()`
    );

    let work = this.#work;

    if (--this.#beginCount === 0) {
      this.#work = new Set();

      for (let item of work) {
        item();
      }
    }

    return { work, count: this.#beginCount };
  }
}

export class Coordinator {
  static create() {
    const inline = InlineQueue.create();
    const queue = Queue.create(() => MicrotaskJob.create());

    return new Coordinator(inline, queue, queue, queue, queue);
  }

  // This queue runs immediately after a mutation has committed
  #inline: InlineQueue;
  // This queue must run before the next paint (in a microtask checkpoint)
  #layout: Queue;
  // This queue can run after the microtask checkpoint, but should be prioritized
  #priority: Queue;
  // This queue should run in the task queue, using the browser's normal heuristics
  #normal: Queue;
  // This queue is low-priority and should run whenever there is idle time
  #idle: Queue;

  private constructor(
    inline: InlineQueue,
    layout: Queue,
    priority: Queue,
    normal: Queue,
    idle: Queue
  ) {
    this.#inline = inline;
    this.#layout = layout;
    this.#priority = priority;
    this.#normal = normal;
    this.#idle = idle;
  }

  /**
   * Call this method if you want to batch a bunch of related changes together.
   * This is most important when using the inline queue, because
   */
  begin(_description: string): { commit: () => number } {
    this.#inline.begin();

    return {
      commit: () => this.#inline.commit(),
    };
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

        case Priority.Inline: {
          this.#inline.add(item.work);
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
