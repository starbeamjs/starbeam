import type { NOW } from "./constants.js";

export interface Clock {
  timestamp: number;
}

export interface GlobalWithNow {
  [NOW]: {
    timestamp: number;
  };
}
