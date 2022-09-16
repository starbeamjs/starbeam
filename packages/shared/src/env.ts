import { COORDINATION } from "./constants.js";

export interface Clock {
  timestamp: number;
}

export interface StarbeamCoordination {
  now: {
    timestamp: number;
  };
  id: {
    get(): string | number;
  };
}

export interface GlobalWithStarbeam {
  [COORDINATION]: StarbeamCoordination;
}

export function getCoordination(): Partial<StarbeamCoordination> {
  let coordination = (globalThis as unknown as GlobalWithStarbeam)[
    COORDINATION
  ];

  if (!coordination) {
    (globalThis as unknown as GlobalWithStarbeam)[COORDINATION] = coordination =
      {} as GlobalWithStarbeam[typeof COORDINATION];
  }

  return coordination;
}
