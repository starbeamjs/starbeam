import { Cell, Marker } from "@starbeam/core";

export function createStorage<T>(
  value: T,
  // TODO: Equality
  callback: () => void,
  description = "storage"
): Cell<T> {
  return Cell(value, description);
}

export function getValue<T>(storage: Cell<T>): T {
  return storage.current;
}

export function setValue<T>(storage: Cell<T>, value: T): void {
  storage.current = value;
}

export function createMarker<T>(description = "marker"): Marker {
  return Marker(description);
}

export function mark(marker: Marker): void {
  marker.update();
}

export function consume(marker: Marker): void {
  marker.consume();
}
