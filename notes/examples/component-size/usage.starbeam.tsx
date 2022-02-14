import { ComponentSize } from "./hook.starbeam.js";
import { ref, useModifier, Starbeam } from "@starbeam/react";

// const useComponentSize = hookify(ComponentSize);

function MyComponent() {
  let el = ref(HTMLImageElement);
  let size = useModifier(el, ComponentSize);

  // size == { width: 100, height: 200 }

  let imgURL = size.match({
    Rendering: () => `https://via.placeholder.com/0x0`,
    Rendered: ({ width, height }) =>
      `https://via.placeholder.com/${width}x${height}`,
  });

  return (
    <Starbeam>
      <div style={{ width: "100%", height: "100%" }}>
        <img ref={el} src={imgURL} />
      </div>
    </Starbeam>
  );
}

function MyComponentSuspense() {
  let el = ref(HTMLImageElement);
  let { width, height } = useModifier(el, ComponentSize).rendered;

  let imgURL = `https://via.placeholder.com/${width}x${height}`;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <img ref={el} src={imgURL} />
    </div>
  );
}

function MyComponentSuspenseMap() {
  let el = ref(HTMLImageElement);
  let size = useModifier(el, ComponentSize);

  // size == { width: 100, height: 200 }

  let imgURL = size.map(
    ({ width, height }) => `https://via.placeholder.com/${width}x${height}`
  ).rendered;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <img ref={el} src={imgURL} />
    </div>
  );
}
