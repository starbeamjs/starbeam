import React, { useState, useEffect, useRef } from "react";

export function useTick(callback: () => void, delay: number): void {
  const savedCallback = useRef(undefined as undefined | (() => void));

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect((): void | (() => void) => {
    function tick() {
      savedCallback.current!();
    }

    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}
