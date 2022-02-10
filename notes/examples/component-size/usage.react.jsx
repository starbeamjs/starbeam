import { useRef } from "react";
import useComponentSize from "./hook.react.js";

function MyComponent() {
  let ref = useRef(null);
  let size = useComponentSize(ref);
  // size == { width: 100, height: 200 }

  let { width, height } = size;
  let imgUrl = `https://via.placeholder.com/${width}x${height}`;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <img ref={ref} src={imgUrl} />
    </div>
  );
}
