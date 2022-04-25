# Resources

```ts
{{#include ./resources/remote-data.ts:RemoteData}}
```

## In UI Frameworks

### React

```ts
{{#include ./resources/in-react.tsx}}
```

### Svelte

```svelte
{{#include ./resources/in-svelte.svelte}}
```

### Vue

```vue
{{#include ./resources/in-vue.vue}}
```

### Ember

```gts
import { use } from "@starbeam/ember";
import { LiterCounter } from "#reactive/liter-counter";

export default class LiterLikeButton extends Component {
  readonly liters = use(LiterCounter);

  <template>
    <button {{on "click" this.liters.increment}}>Add a liter</button>
    <p>{this.liters.description}</p>
  </template>
}
```