# The Big Picture

Starbeam is a data-first framework. Your app is a function from Reactive Data to Reactive DOM.

<center>

\\( f(data) = dom \\)

</center>

> TODO: Unlike Virtual DOM

## What is Reactivity?

A Reactive web application has a Reactive DOM that remains up to date as its
underlying Reactive Data changes.

Unlike older paradigms, a programmer using a Reactive framework does not need to
manually update the DOM when the Reactive Data changes. Instead, the programmer
describes the DOM as a function of Reactive Data, and the framework maintains
consistency between the Reactive Data and the Reactive DOM.

## The Simplest Example

```ts
let name = universe.cell("Tom");
let text = universe.render(universe.dom.text(name));

// the text node contains "Tom"

name.update("Thomas");

// TODO: Subsume this in RenderResult + Auto-Top-Down-Revalidation
universe.poll(text);

// the text node contains "Thomas"
```

> What is a universe?

## Reactive Data

In Starbeam, the fundamental building block of Reactivity is a single, atomic
piece of state.

```ts
let name = universe.cell("Tom");
```

This code creates a single, atomic storage, and puts the string `"Tom"` in it.

## Reactive DOM

In Starbeam, instead of creating DOM nodes directly, you create a Reactive DOM
Node and supply it with Reactive Data.

```ts
let textNode = universe.dom.text(name);
```

Once you have constructed a Reactive DOM Node, you render it. Starbeam creates a
concrete DOM Node, which it will keep up to date as the underlying cell changes.

## Updating the Cell

```ts
name.update("Thomas");
```

You can update any number of pieces of Reactive Data at once. Updating a piece of Reactive Data does **not** immediately cause the DOM to update. However, once you have updated a piece of Reactive Data, its new value is immediately visible.

```ts
let name = universe.cell("Tom");
name.update("Thomas");
name.current; // Tom
```

This is important because the values that you see **while updating your data** are always consistent. The values that you see when working with your data are never dependent on the timing of Starbeam updates.

## Computation

Of course, you cannot write a program with only atomic variables. You need functions as well.

```ts
let name = universe.cell("Tom");
let title = universe.memo(() => name.current.toUpperCase());

let text = universe.render(universe.dom.text(title));

// the text node contains "TOM"
```

Reactive Computations are another kind of Reactive Data, and Reactive Text Nodes
can be supplied with any kind of Reactive Data. This is what makes the Reactive
DOM so powerful. ...

## Elements and Attributes

Text nodes are great, but to build a real Reactive application, we will need
elements and attributes.

```ts
let { element, text } = universe.dom;

let person = {
  name: universe.cell("Thomas Dale"),
  nickname: universe.cell("Tom"),
  org: universe.cell("LinkedIn"),
  tel: universe.cell("+15551212"),
  url: universe.cell("http://tomdale.net/"),
};

let element = element("ul", { class: "vcard" }, [
  element("li", { class: "fn" }, [text(person.name)]),
  element("li", { class: "nickname" }, [text(person.nickname)]),
  element("li", { class: "org" }, [text(person.org)]),
  element("li", { class: "tel" }, [text(person.tel)]),
  element("li", [
    element("a", { class: "url", href: person.url }, [text(person.url)]),
  ]),
]);

let card = universe.render(element);
```

### Rendered Output

```html
<ul class="vcard">
  <li class="fn">Tom Dale</li>
  <li class="nickname">Tom</li>
  <li class="org">LinkedIn</li>
  <li class="tel">+15551212</li>
  <li><a class="url" href="http://tomdale.net/">http://tomdale.net/</a></li>
</ul>
```

### Updating the Data

```ts
>> person.url.update("https://tomdale.net");
>> person.url.current
-> "https://tomdale.net"
>> person.org.update("LinkedIn Corporation");
>> person.url.current
-> "LinkedIn Corporation"
>> card.update();
```

### Updated Output

```html
<ul class="vcard">
  <li class="fn">Tom Dale</li>
  <li class="nickname">Tom</li>
  <li class="org">LinkedIn Corporation</li>
  <li class="tel">+15551212</li>
  <li><a class="url" href="https://tomdale.net">https://tomdale.net</a></li>
</ul>
```

## Components

Components aren't a special concept in Starbeam: a Component is just a function
that takes a Reactive parameter and returns a Reactive DOM Node.

### The Component

```ts
function ContactCard({ name, nickname, org tel, url }) {
  return element("ul", { class: "vcard" }, [
    element("li", { class: "fn" }, [text(name)]),
    element("li", { class: "nickname" }, [text(nickname)]),
    element("li", { class: "org" }, [text(org)]),
    element("li", { class: "tel" }, [text(tel)]),
    element("li", [element("a", { class: "url", href: url }, [text(url)])]),
  ]);
}
```

### Rendering the Component

```ts
let tom = {
  name: universe.cell("Thomas Dale"),
  nickname: universe.cell("Tom"),
  org: universe.cell("LinkedIn"),
  tel: universe.cell("+15551212"),
  url: universe.cell("http://tomdale.net/"),
};

let yehuda = {
  name: universe.cell("Yehuda Katz"),
  nickname: universe.cell("Yehuda"),
  org: universe.cell("Tilde"),
  tel: universe.cell("+15551212"),
  url: universe.cell("http://yehudakatz.com/"),
};

let fragment = universe.fragment([ContactCard(tom), ContactCard(yehuda)]);

universe.render(fragment, { into: "body" });
```

### Rendered Output

```html
<ul class="vcard">
  <li class="fn">Tom Dale</li>
  <li class="nickname">Tom</li>
  <li class="org">LinkedIn</li>
  <li class="tel">+15551212</li>
  <li><a class="url" href="http://tomdale.net/">http://tomdale.net/</a></li>
</ul>
<ul class="vcard">
  <li class="fn">Yehuda Katz</li>
  <li class="nickname">Yehuda</li>
  <li class="org">Tilde</li>
  <li class="tel">+15551212</li>
  <li>
    <a class="url" href="http://yehudakatz.com/">http://yehudakatz.com/</a>
  </li>
</ul>
```

### Updating the Data

```ts
>> tom.url.update("https://tomdale.net");
>> result.update();
```

### Updated Output

```diff
- <li><a class="url" href="http://tomdale.net/">http://tomdale.net/</a></li>
+ <li><a class="url" href="https://tomdale.net">https://tomdale.net</a></li>
```

> 💡 Interestingly, after we called `result.update()`, Starbeam was able to
> identify and update exactly two DOM nodes, without any kind of diffing.

## For the Curious: Discrete vs. Continuous Reactivity
