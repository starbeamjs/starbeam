import { useCallback, useEffect, useState } from "react";

type HashPair<T> = [T, (newHash: T) => void];

export function useHash(initial?: string): HashPair<string> {
  const [hash, setHash] = useState(() => {
    if (window.location.hash) {
      return window.location.hash.slice(1);
    } else if (initial) {
      window.location.hash = initial;
      return initial;
    } else {
      return "";
    }
  });

  const hashChangeHandler = useCallback(() => {
    setHash(window.location.hash.slice(1));
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", hashChangeHandler);
    return () => {
      window.removeEventListener("hashchange", hashChangeHandler);
    };
  }, []);

  const updateHash = useCallback(
    (newHash: string) => {
      if (newHash !== hash) window.location.hash = newHash;
    },
    [hash]
  );

  return [hash, updateHash];
}
