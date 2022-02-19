export interface ExternalGlue<Revision, Value> {
    (shouldPoll: () => void): {
        poll(): Revision;
        value(): Value;
    };
}
