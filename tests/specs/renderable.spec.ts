import { LIFETIME, reactive, TIMELINE } from "@starbeam/core";
import { Formula } from "@starbeam/reactive";
import type { Renderable } from "@starbeam/timeline";
import { expect, test, toBe } from "../support/define.js";

test("registering renderables", () => {
  const user = reactive({
    username: "@tomdale",
    location: "United States",
  });

  const card = Formula(() => `${user.username} (${user.location})`);

  let text: string = card.current;

  function updateText(renderable: Renderable<string>) {
    const update = renderable.render();

    if (update.status === "unchanged") {
      return;
    }

    text = update.value;
  }

  const batch = TestBatch.create();

  const renderable = TIMELINE.on.change(card, (renderable) => {
    batch.add(renderable, updateText);
  });

  user.location = "NYC";
  expect(text, toBe("@tomdale (United States)"));

  batch.flush();

  expect(text, toBe("@tomdale (NYC)"));

  LIFETIME.finalize(renderable);

  user.location = "Manhattan";

  expect(text, toBe("@tomdale (NYC)"));
});

class TestBatch {
  static create(): TestBatch {
    return new TestBatch(new Set());
  }

  private constructor(readonly work: Set<() => void>) {}

  add<T>(renderable: Renderable<T>, work: (renderable: Renderable<T>) => void) {
    this.work.add(() => work(renderable));
  }

  flush(): void {
    for (const item of this.work) {
      item();
    }

    this.work.clear();
  }
}
