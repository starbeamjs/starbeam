import ImportedNodeEnvironment from "jest-environment-node";
const NodeEnvironment = ImportedNodeEnvironment;
class CustomEnvironment extends NodeEnvironment {
    #console;
    #testPath;
    #docblockPragmas;
    constructor(config, context) {
        let console = globalThis.console;
        super(config, context);
        this.#console = console;
        Object.defineProperty(this.global, "console", {
            enumerable: true,
            configurable: false,
            get: () => console,
            set: () => {
                // console.log(
                //   `Someone (probably jest) is attempting to hijack console. Ignoring.`
                // );
            },
        });
        this.#testPath = context?.testPath;
        this.#docblockPragmas = context?.docblockPragmas;
    }
    get fakeTimers() {
        return super.fakeTimers;
    }
    get fakeTimersModern() {
        return super.fakeTimersModern;
    }
    get moduleMocker() {
        return super.moduleMocker;
    }
    exportConditions;
    async setup() {
        await super.setup();
        // await someSetupTasks(this.testPath);
        // this.global.someGlobalObject = createGlobalObject();
        // Will trigger if docblock contains @my-custom-pragma my-pragma-value
        // if (this.docblockPragmas["my-custom-pragma"] === "my-pragma-value") {
        //   // ...
        // }
    }
    async teardown() {
        // this.global.someGlobalObject = destroyGlobalObject();
        // await someTeardownTasks();
        await super.teardown();
    }
    getVmContext() {
        return super.getVmContext();
    }
    handleTestEvent(event, state) {
        if (event.name === "test_start") {
            // ...
        }
    }
}
export default CustomEnvironment;
// module.exports = CustomEnvironment;
//# sourceMappingURL=environment.js.map