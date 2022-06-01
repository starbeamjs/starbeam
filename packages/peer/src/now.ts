const NOW = {
  timestamp: 0,
};

export function now(): number {
  return NOW.timestamp;
}

export function bump(): number {
  NOW.timestamp = NOW.timestamp + 1;
  return now();
}
