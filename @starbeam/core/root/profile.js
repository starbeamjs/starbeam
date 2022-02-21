/// Stripping checks related to this enum should eventually be handled as a
/// build-time step for release builds.
export var Profile;
(function (Profile) {
    Profile["Debug"] = "Debug";
    /// In the production profile, the DOM is a write-only data structure (reading
    /// from the DOM is disallowed).
    Profile["Production"] = "Production";
    /// In the server-side profile, the DOM is a write-once data structure
    /// (reading from the DOM *and* updating the DOM is disallowed).
    Profile["ServerSide"] = "ServerSide";
})(Profile = Profile || (Profile = {}));
//# sourceMappingURL=profile.js.map