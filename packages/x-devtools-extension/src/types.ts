/// <reference types="chrome-types" />

export interface ConnectMessage {
  type: "starbeam:connect";
  tabId: number;
  script: string;
}

export type MessageFromSW = unknown;

export const Chrome = chrome;
