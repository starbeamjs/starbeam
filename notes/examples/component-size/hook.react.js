"use strict";
var React = require("react");
var useState = React.useState;
var useCallback = React.useCallback;
var useLayoutEffect = React.useLayoutEffect;

function getSize(el) {
  if (!el) {
    return {
      width: 0,
      height: 0,
    };
  }

  return {
    width: el.offsetWidth,
    height: el.offsetHeight,
  };
}

function useComponentSize(ref) {
  let [ComponentSize, setComponentSize] = useState(
    getSize(ref ? ref.current : {})
  );

  var handleResize = useCallback(
    function handleResize() {
      if (ref.current) {
        setComponentSize(getSize(ref.current));
      }
    },
    [ref]
  );

  useLayoutEffect(
    function () {
      if (!ref.current) {
        return;
      }

      handleResize();

      if (typeof ResizeObserver === "function") {
        var resizeObserver = new ResizeObserver(function () {
          handleResize();
        });
        resizeObserver.observe(ref.current);

        return function () {
          resizeObserver.disconnect(ref.current);
          resizeObserver = null;
        };
      } else {
        window.addEventListener("resize", handleResize);

        return function () {
          window.removeEventListener("resize", handleResize);
        };
      }
    },
    [ref.current]
  );

  return ComponentSize;
}

module.exports = useComponentSize;
