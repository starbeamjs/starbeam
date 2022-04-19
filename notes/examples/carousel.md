https://codereview.stackexchange.com/questions/270670/carousel-in-react

```tsx
import React from "react";
import { AiOutlineArrowLeft, AiOutlineArrowRight } from "react-icons/ai";
import { useResizeDetector } from "react-resize-detector";

let arrowStyle = {
  background: "white",
  border: "1px solid lightgray",
  borderRadius: "20%",
  cursor: "pointer",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: 30,
  width: 30,
  boxShadow: "rgba(0, 0, 0, 0.24) 0px 3px 8px",
};

export default function Carousel(props) {
  let [count, setCount] = React.useState(0);
  let innerContainer = React.useRef();

  // We use these coordinates to know if we should show left/right arrows or not
  let [relativeCords, setRelativeCords] = React.useState({});

  // We use this variable because during transition if user clicks multiple times the arrow buttons, coordinates are not computed correctly anymore
  let [transitionBlock, setTransitionBlock] = React.useState(false);

  let innerContainerRelativeCordsToParent = () => {
    let relativeLeft =
      innerContainer.current.getBoundingClientRect().left -
      ref.current.getBoundingClientRect().left;
    let relativeRight =
      ref.current.getBoundingClientRect().right -
      innerContainer.current.getBoundingClientRect().right;

    setRelativeCords({ relativeLeft, relativeRight });
  };

  const onResize = React.useCallback(() => {
    // When main container is resized we want to update relative coordinates
    innerContainerRelativeCordsToParent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { ref } = useResizeDetector({ onResize });

  React.useEffect(() => {
    innerContainerRelativeCordsToParent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    // We need to run this also when transition ends to get fresh coordinates
    innerContainer.current.addEventListener("transitionend", () => {
      innerContainerRelativeCordsToParent();
      setTransitionBlock(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="carousel" style={{ padding: 50 }}>
      <div
        style={{
          paddingLeft: 50,
          position: "relative",
          paddingRight: 50,
        }}
      >
        <div
          ref={ref}
          style={{
            overflow: "hidden",
          }}
        >
          {/* If you have height issues with below div, see this: https://stackoverflow.com/questions/27536428/inline-block-element-height-issue */}
          <div
            ref={innerContainer}
            style={{
              display: "inline-block",
              whiteSpace: "nowrap",
              transition: "transform 0.4s linear",
              transform: `translateX(${-count * 100}px)`,
            }}
          >
            {props.items.map((x) => {
              return (
                <div
                  key={x.id}
                  style={{
                    padding: 5,
                    display: "inline-block",
                    width: 150,
                    height: 150,
                    marginLeft: 5,
                    marginRight: 5,
                    border: "1px solid lightgray",
                    borderRadius: 10,
                    overflow: "auto",
                    whiteSpace: "normal",
                  }}
                >
                  <h1>{x.title}</h1>
                  <p>{x.body}</p>
                </div>
              );
            })}
          </div>
        </div>
        <button
          style={{
            ...arrowStyle,
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
          }}
          disabled={relativeCords.relativeLeft >= 0}
          onClick={() => {
            if (transitionBlock) return;
            setCount(count - 1);
            setTransitionBlock(true);
          }}
        >
          <AiOutlineArrowLeft />
        </button>
        <button
          style={{
            ...arrowStyle,
            position: "absolute",
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
          }}
          disabled={relativeCords.relativeRight >= 0}
          onClick={() => {
            if (transitionBlock) return;
            setCount(count + 1);
            setTransitionBlock(true);
          }}
        >
          <AiOutlineArrowRight />
        </button>
      </div>
    </div>
  );
}
```

Starbeam:

```tsx
import React from "react";
import { AiOutlineArrowLeft, AiOutlineArrowRight } from "react-icons/ai";
import { useResizeDetector } from "react-resize-detector";

let arrowStyle = {
  background: "white",
  border: "1px solid lightgray",
  borderRadius: "20%",
  cursor: "pointer",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: 30,
  width: 30,
  boxShadow: "rgba(0, 0, 0, 0.24) 0px 3px 8px",
};

const RelativeCoordinates = Modifier(
  ({ inner, outer }, modifier) => {
    const outerSize = modifier.use(ElementSize, outer);

    return () => {
      const left = inner.getBoundingClientRect().left - outerSize.left;
      const right = outerSize.right - inner.getBoundingClientRect().right;

      return { left, right };
    };
  },
  // you could also specify elements as an object, and the values would be HTML Element classes: {
  //   outer: HTMLFormElement,
  //   inner: HTMLInputElement,
  // }
  { elements: ["inner", "outer"] }
);

export default function Carousel(props) {
  return useStarbeam((starbeam) => {
    const state = reactive({
      index: 0,
    });

    const [elements, coordinates] = starbeam.use(RelativeCoordinates);

    return () => {
      const buttons = coordinates.map(({ left, right }) => (
        <>
          <button
            style={{
              ...arrowStyle,
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
            }}
            disabled={left >= 0}
            onClick={() => {
              if (transitionBlock) return;
              state.index--;
              setTransitionBlock(true);
            }}
          >
            <AiOutlineArrowLeft />
          </button>
          <button
            style={{
              ...arrowStyle,
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
            }}
            disabled={right >= 0}
            onClick={() => {
              if (transitionBlock) return;
              state.index++;
              setTransitionBlock(true);
            }}
          >
            <AiOutlineArrowRight />
          </button>
        </>
      ));

      return (
        <div className="carousel" style={{ padding: 50 }}>
          <div
            style={{
              paddingLeft: 50,
              position: "relative",
              paddingRight: 50,
            }}
          >
            <div
              ref={elements.outer}
              style={{
                overflow: "hidden",
              }}
            >
              {/* If you have height issues with below div, see this: https://stackoverflow.com/questions/27536428/inline-block-element-height-issue */}
              <div
                ref={elements.inner}
                style={{
                  display: "inline-block",
                  whiteSpace: "nowrap",
                  transition: "transform 0.4s linear",
                  transform: `translateX(${-count * 100}px)`,
                }}
              >
                {props.items.map((x) => {
                  return (
                    <div
                      key={x.id}
                      style={{
                        padding: 5,
                        display: "inline-block",
                        width: 150,
                        height: 150,
                        marginLeft: 5,
                        marginRight: 5,
                        border: "1px solid lightgray",
                        borderRadius: 10,
                        overflow: "auto",
                        whiteSpace: "normal",
                      }}
                    >
                      <h1>{x.title}</h1>
                      <p>{x.body}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            {buttons}
          </div>
        </div>
      );
    };
  });
}
```
