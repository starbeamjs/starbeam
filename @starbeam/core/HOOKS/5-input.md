## Getting Data In

### Ad-Hoc: Actions

### Stateful External Connections: Resources

A resource is a [stateful object][lifetime] that represents external input data
that can change over time.

<Flowchart direction="TD">
  Setup --> Running --> Finalize
    Setup["Setup <i>(connect to an external API)</i>"]:::start
    Running["Running<br><em>Translate events that come from the external API into mutations on reactive data.</em>"]
    Finalize["Finalize <i>(disconnect from the external API)</i>"]:::finish
</Flowchart>

For example, let's say I have some user information that I get from a channel
provided by my server API. Behind the scenes, the channel is implemented using
WebSockets. As long as I'm subscribed to it, it gives me up-to-date information
about the user whenever new information is available on the server.

I need to _subscribe_ to the channel in to start receive updates and
_unsubscribe_ when I'm done using it (in order to avoid memory leaks).

```ts
const UserInformation = Resource((resource) => {
  // Create a reactive cell that will represent the UserInformation.
  // At first, it's in the loading state.
  const user = Cell({ state: "loading" });

  // Subscribe to the "user" channel. Whenever there is new information,
  // update the `user` cell with the new information.
  const channel = server.subscribe("user", (info) => {
    user.set({ state: "loaded", info });
  });

  // Whenever the resource is finalized, disconnect from the channel.
  resource.on.finalize(() => channel.disconnect());

  return user;
});
```

We can `use` the `UserInformation` resource in the context of a stateful object.
In this case, we want to use it inside of our `UserInfo` component.

For this example, we'll use `@starbeam/react`.

```ts
export function UserInfo() {
  return useReactiveElement((component) => {
    // Instantiate the `UserInformation` resource and link its lifetime to the
    // current `UserInfo` component. When this component is deactivated by
    // React, the channel inside of `UserInformation` is automatically
    // disconnected.
    const user = component.use(UserInformation);

    // As user (a `UserInformation` instance) receives updates from the
    // channel, re-render the component with this render function.
    return () => {
      if (user.state === "loading") {
        return <Loading />;
      } else {
        const { info } = user;
        return (
          <div className="contact-card">
            <h1>{info.name}</h1>
            <p>{info.description}</p>
          </div>
        );
      }
    };
  });
}
```

### Reading From the DOM: Input Modifiers
