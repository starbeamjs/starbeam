import type {
  IntoResourceBlueprint,
  ResourceBlueprint,
} from "@starbeam/resource";
import { use } from "@starbeam/resource";
import { CONTEXT } from "@starbeam/runtime";
import { type Ref, shallowRef } from "vue";

import { useReactive } from "./setup.js";

// | API             | Parameter               | Returns                 |
// | --------------- | ----------------------- | ----------------------- |
// | `setupReactive` | `() => Reactive<T>`     | [`Native<T>`]           |
// | `setupResource` | `IntoResourceBlueprint` | [`Native<T>`] React[^1] |
// | `getService`    | `IntoResourceBlueprint` | [`Native<T>`]           |

// export function setupReactive()

export function create<T>(resource: ResourceBlueprint<T, void>): Ref<T> {
  const vueInstance = useReactive();

  const reactive = use(resource, { lifetime: vueInstance });
  const ref = shallowRef(reactive.current);
  vueInstance.render(reactive, () => (ref.value = reactive.current));

  return ref;
}

export function service<T>(blueprint: IntoResourceBlueprint<T>): Ref<T> {
  const vueInstance = useReactive();
  const app = vueInstance.app;

  const reactive = CONTEXT.create(
    blueprint,
    () => use(blueprint, { lifetime: app }),
    {
      app,
    }
  );

  const ref = shallowRef(reactive.current);
  vueInstance.render(reactive, () => (ref.value = reactive.current));

  return ref;
}
