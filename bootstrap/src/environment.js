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
    handleTestEvent = (event, state) => {
        if (event.name === "test_start") {
            // ...
        }
    };
}
export default CustomEnvironment;
// module.exports = CustomEnvironment;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlbnZpcm9ubWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxPQUFPLHVCQUF1QixNQUFNLHVCQUF1QixDQUFDO0FBMEI1RCxNQUFNLGVBQWUsR0FBRyx1QkFBeUMsQ0FBQztBQUlsRSxNQUFNLGlCQUNKLFNBQVEsZUFBZTtJQUdkLFFBQVEsQ0FBVTtJQUNsQixTQUFTLENBQXFCO0lBQzlCLGdCQUFnQixDQUE4QjtJQUV2RCxZQUFZLE1BQTRCLEVBQUUsT0FBNEI7UUFDcEUsSUFBSSxPQUFPLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQztRQUNqQyxLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXZCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBRXhCLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUU7WUFDNUMsVUFBVSxFQUFFLElBQUk7WUFDaEIsWUFBWSxFQUFFLEtBQUs7WUFDbkIsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU87WUFDbEIsR0FBRyxFQUFFLEdBQUcsRUFBRTtnQkFDUixlQUFlO2dCQUNmLHlFQUF5RTtnQkFDekUsS0FBSztZQUNQLENBQUM7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sRUFBRSxRQUFRLENBQUM7UUFDbkMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE9BQU8sRUFBRSxlQUFlLENBQUM7SUFDbkQsQ0FBQztJQUVELElBQUksVUFBVTtRQUNaLE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQztJQUMxQixDQUFDO0lBRUQsSUFBSSxnQkFBZ0I7UUFDbEIsT0FBTyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7SUFDaEMsQ0FBQztJQUVELElBQUksWUFBWTtRQUNkLE9BQU8sS0FBSyxDQUFDLFlBQVksQ0FBQztJQUM1QixDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQUs7UUFDVCxNQUFNLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQix1Q0FBdUM7UUFDdkMsdURBQXVEO1FBRXZELHNFQUFzRTtRQUN0RSx3RUFBd0U7UUFDeEUsV0FBVztRQUNYLElBQUk7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLFFBQVE7UUFDWix3REFBd0Q7UUFDeEQsNkJBQTZCO1FBQzdCLE1BQU0sS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxZQUFZO1FBQ1YsT0FBTyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVELGVBQWUsR0FBRyxDQUNoQixLQUEyQyxFQUMzQyxLQUFtQixFQUNHLEVBQUU7UUFDeEIsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFlBQVksRUFBRTtZQUMvQixNQUFNO1NBQ1A7SUFDSCxDQUFDLENBQUM7Q0FDSDtBQUVELGVBQWUsaUJBQWlCLENBQUM7QUFDakMsc0NBQXNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBFbnZpcm9ubWVudENvbnRleHQsIEplc3RFbnZpcm9ubWVudCB9IGZyb20gXCJAamVzdC9lbnZpcm9ubWVudFwiO1xuaW1wb3J0IHR5cGUgeyBMZWdhY3lGYWtlVGltZXJzLCBNb2Rlcm5GYWtlVGltZXJzIH0gZnJvbSBcIkBqZXN0L2Zha2UtdGltZXJzXCI7XG5pbXBvcnQgdHlwZSB7IENpcmN1cywgQ29uZmlnLCBHbG9iYWwgYXMgSmVzdEdsb2JhbCB9IGZyb20gXCJAamVzdC90eXBlc1wiO1xuaW1wb3J0IEltcG9ydGVkTm9kZUVudmlyb25tZW50IGZyb20gXCJqZXN0LWVudmlyb25tZW50LW5vZGVcIjtcbmltcG9ydCB0eXBlIHsgTW9kdWxlTW9ja2VyIH0gZnJvbSBcImplc3QtbW9ja1wiO1xuaW1wb3J0IHR5cGUgeyBDb250ZXh0IH0gZnJvbSBcInZtXCI7XG5cbmRlY2xhcmUgaW50ZXJmYWNlIFRpbWVyIHtcbiAgcmVhZG9ubHkgaWQ6IG51bWJlcjtcbiAgcmVhZG9ubHkgcmVmOiAoKSA9PiBUaW1lcjtcbiAgcmVhZG9ubHkgdW5yZWY6ICgpID0+IFRpbWVyO1xufVxuXG5kZWNsYXJlIGNsYXNzIE5vZGVFbnYgZXh0ZW5kcyBKZXN0RW52aXJvbm1lbnQ8VGltZXI+IHtcbiAgY29uc3RydWN0b3IoY29uZmlnOiBDb25maWcuUHJvamVjdENvbmZpZywgY29udGV4dD86IEVudmlyb25tZW50Q29udGV4dCk7XG59XG5cbmludGVyZmFjZSBOb2RlRW52IHtcbiAgY29udGV4dDogRW52aXJvbm1lbnRDb250ZXh0IHwgbnVsbDtcbiAgZmFrZVRpbWVyczogTGVnYWN5RmFrZVRpbWVyczxUaW1lcj4gfCBudWxsO1xuICBmYWtlVGltZXJzTW9kZXJuOiBNb2Rlcm5GYWtlVGltZXJzIHwgbnVsbDtcbiAgZ2xvYmFsOiBKZXN0R2xvYmFsLkdsb2JhbDtcbiAgbW9kdWxlTW9ja2VyOiBNb2R1bGVNb2NrZXIgfCBudWxsO1xuXG4gIHNldHVwKCk6IFByb21pc2U8dm9pZD47XG4gIHRlYXJkb3duKCk6IFByb21pc2U8dm9pZD47XG4gIGdldFZtQ29udGV4dCgpOiBDb250ZXh0IHwgbnVsbDtcbn1cblxuY29uc3QgTm9kZUVudmlyb25tZW50ID0gSW1wb3J0ZWROb2RlRW52aXJvbm1lbnQgYXMgdHlwZW9mIE5vZGVFbnY7XG5cbnR5cGUgRG9jYmxvY2tQcmFnbWFzID0gUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgcmVhZG9ubHkgc3RyaW5nW10+O1xuXG5jbGFzcyBDdXN0b21FbnZpcm9ubWVudFxuICBleHRlbmRzIE5vZGVFbnZpcm9ubWVudFxuICBpbXBsZW1lbnRzIEplc3RFbnZpcm9ubWVudDxUaW1lcj5cbntcbiAgcmVhZG9ubHkgI2NvbnNvbGU6IENvbnNvbGU7XG4gIHJlYWRvbmx5ICN0ZXN0UGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICByZWFkb25seSAjZG9jYmxvY2tQcmFnbWFzOiBEb2NibG9ja1ByYWdtYXMgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBDb25maWcuUHJvamVjdENvbmZpZywgY29udGV4dD86IEVudmlyb25tZW50Q29udGV4dCkge1xuICAgIGxldCBjb25zb2xlID0gZ2xvYmFsVGhpcy5jb25zb2xlO1xuICAgIHN1cGVyKGNvbmZpZywgY29udGV4dCk7XG5cbiAgICB0aGlzLiNjb25zb2xlID0gY29uc29sZTtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLmdsb2JhbCwgXCJjb25zb2xlXCIsIHtcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZ2V0OiAoKSA9PiBjb25zb2xlLFxuICAgICAgc2V0OiAoKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFxuICAgICAgICAvLyAgIGBTb21lb25lIChwcm9iYWJseSBqZXN0KSBpcyBhdHRlbXB0aW5nIHRvIGhpamFjayBjb25zb2xlLiBJZ25vcmluZy5gXG4gICAgICAgIC8vICk7XG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy4jdGVzdFBhdGggPSBjb250ZXh0Py50ZXN0UGF0aDtcbiAgICB0aGlzLiNkb2NibG9ja1ByYWdtYXMgPSBjb250ZXh0Py5kb2NibG9ja1ByYWdtYXM7XG4gIH1cblxuICBnZXQgZmFrZVRpbWVycygpOiBMZWdhY3lGYWtlVGltZXJzPFRpbWVyPiB8IG51bGwge1xuICAgIHJldHVybiBzdXBlci5mYWtlVGltZXJzO1xuICB9XG5cbiAgZ2V0IGZha2VUaW1lcnNNb2Rlcm4oKTogTW9kZXJuRmFrZVRpbWVycyB8IG51bGwge1xuICAgIHJldHVybiBzdXBlci5mYWtlVGltZXJzTW9kZXJuO1xuICB9XG5cbiAgZ2V0IG1vZHVsZU1vY2tlcigpOiBNb2R1bGVNb2NrZXIgfCBudWxsIHtcbiAgICByZXR1cm4gc3VwZXIubW9kdWxlTW9ja2VyO1xuICB9XG5cbiAgYXN5bmMgc2V0dXAoKSB7XG4gICAgYXdhaXQgc3VwZXIuc2V0dXAoKTtcbiAgICAvLyBhd2FpdCBzb21lU2V0dXBUYXNrcyh0aGlzLnRlc3RQYXRoKTtcbiAgICAvLyB0aGlzLmdsb2JhbC5zb21lR2xvYmFsT2JqZWN0ID0gY3JlYXRlR2xvYmFsT2JqZWN0KCk7XG5cbiAgICAvLyBXaWxsIHRyaWdnZXIgaWYgZG9jYmxvY2sgY29udGFpbnMgQG15LWN1c3RvbS1wcmFnbWEgbXktcHJhZ21hLXZhbHVlXG4gICAgLy8gaWYgKHRoaXMuZG9jYmxvY2tQcmFnbWFzW1wibXktY3VzdG9tLXByYWdtYVwiXSA9PT0gXCJteS1wcmFnbWEtdmFsdWVcIikge1xuICAgIC8vICAgLy8gLi4uXG4gICAgLy8gfVxuICB9XG5cbiAgYXN5bmMgdGVhcmRvd24oKSB7XG4gICAgLy8gdGhpcy5nbG9iYWwuc29tZUdsb2JhbE9iamVjdCA9IGRlc3Ryb3lHbG9iYWxPYmplY3QoKTtcbiAgICAvLyBhd2FpdCBzb21lVGVhcmRvd25UYXNrcygpO1xuICAgIGF3YWl0IHN1cGVyLnRlYXJkb3duKCk7XG4gIH1cblxuICBnZXRWbUNvbnRleHQoKSB7XG4gICAgcmV0dXJuIHN1cGVyLmdldFZtQ29udGV4dCgpO1xuICB9XG5cbiAgaGFuZGxlVGVzdEV2ZW50ID0gKFxuICAgIGV2ZW50OiBDaXJjdXMuU3luY0V2ZW50IHwgQ2lyY3VzLkFzeW5jRXZlbnQsXG4gICAgc3RhdGU6IENpcmN1cy5TdGF0ZVxuICApOiB2b2lkIHwgUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgaWYgKGV2ZW50Lm5hbWUgPT09IFwidGVzdF9zdGFydFwiKSB7XG4gICAgICAvLyAuLi5cbiAgICB9XG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IEN1c3RvbUVudmlyb25tZW50O1xuLy8gbW9kdWxlLmV4cG9ydHMgPSBDdXN0b21FbnZpcm9ubWVudDtcbiJdfQ==