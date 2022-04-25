# Data Universe

With Starbeam reactivity, you describe the states that can change, and
computations based on those states automatically update.

**Data Coherence**: When you change a state, all of the computations derived
from that state immediately reflect the change.

```ts
import { Cell, reactive } from "@starbeam/core";

const counter = reactive(0);
```

## Counter

```ts
import { Cell } from "@starbeam/core";

const counter = Cell(0);

function increment() {
  counter.current++;
}

counter.current; //? 0

increment();

counter.current; //? 1
```
