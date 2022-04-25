# Data Cells and Formula Cells

## Data Cells

```ts
{{#include ./cells-and-formulas/introduction.ts}}
```

## Formula Cells

```ts
import { reactive, formula } from "@starbeam/core";

const description = formula(() => format(state.liters));

subscribe(description, (subscription) => {
  console.log(subscription.poll());
});

increment(); // ChangedValue(1)
increment(); // ChangedValue(2)
```

## In UI Frameworks

### Making it Universal: Turning it Into a Resource


```ts
{{#include ./cells-and-formulas/as-resource.ts:LiterCounter}}
```

#### Using a Class

```ts
{{#include ./cells-and-formulas/as-resource-class.ts}}
```

### React

```ts
{{#include ./cells-and-formulas/in-react.tsx}}
```

### Svelte

```svelte
{{#include ./cells-and-formulas/in-svelte.svelte}}
```

### Vue

```vue
{{#include ./cells-and-formulas/in-vue.vue}}
```

### Ember

```gts
import { use } from "@starbeam/ember";
import { LiterCounter } from "#reactive/liter-counter";

export default class LiterLikeButton extends Component {
  readonly liters = use(LiterCounter);

  <template>
    <button {{on "click" this.liters.increment}}>Add a liter</button>
    <p>{{this.liters.description}}</p>
  </template>
}
```
