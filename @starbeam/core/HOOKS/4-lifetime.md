## Stateful Objects and Lifetimes

[stateful object]: #stateful-objects-and-lifetimes
[lifetime]: #stateful-objects-and-lifetimes

In Starbeam, stateful objects have **lifetimes**. An object's lifetime starts
when it is **instantiated**, and ends when it is **finalized**.

<Flowchart direction="LR">
  Setup --> Running --> Finalized
    Setup:::start
    Finalized:::finish
</Flowchart>

### ✨ Web Framework Components

[component]: #✨-web-framework-components

Inside of a web framework, every component has is a lifetime, which starts when
the component is constructed by the framework and ends when the framework
removes the component's elements from the DOM or when the framework deactivates
the components.

> 📘 **Framework-Specific Details**
>
> Each framework has a concrete definition of "constructed", "removed from the
> DOM", and "deactivated". Starbeam's framework adapters map these
> framework-specific concepts onto Starbeam's universal concepts.
