import { lifetime, subscribe, type Reactive } from "@starbeam/core";
import { Observable } from "zen-observable-ts";

export function display<T>(reactive: Reactive<T>) {
  return new Observable((observer) => {
    const subscription = subscribe(reactive, (): void => {
      const next = subscription.poll();

      if (next.status !== "unchanged") {
        observer.next(next.value);
      }
    });

    const initial = subscription.poll();

    observer.next(initial.value);

    return () => lifetime.finalize(subscription);
  });
}
