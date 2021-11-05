/// Stripping checks related to this enum should eventually be handled as a
/// build-time step for release builds.
export enum Profile {
  Debug = "Debug",
  /// In the production profile, the DOM is a write-only data structure (reading
  /// from the DOM is disallowed).
  Production = "Production",
  /// In the server-side profile, the DOM is a write-once data structure
  /// (reading from the DOM *and* updating the DOM is disallowed).
  ServerSide = "ServerSide",
}
