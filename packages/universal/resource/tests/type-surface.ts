import { Resource, SyncTo } from "@starbeam/resource";

Resource(({ on }) => {
  on.sync(() => undefined);
  on.lowLevel.finalize(() => undefined);

  // @ts-expect-error Deprecated alias is hidden from normal authoring.
  on.finalize(() => undefined);

  return {};
});

SyncTo(({ on }) => {
  on.sync(() => undefined);
  on.lowLevel.finalize(() => undefined);

  // @ts-expect-error Deprecated alias is hidden from normal authoring.
  on.finalize(() => undefined);
});
