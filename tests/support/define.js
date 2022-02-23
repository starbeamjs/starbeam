import * as jest from "@jest/globals";
import { Abstraction, Cell, is, Reactive, ReactiveMetadata, RenderedRoot, verify, } from "@starbeam/core";
import { DomEnvironment, ElementProgramNodeBuilder, HTML_NAMESPACE, ReactiveDOM, Root, } from "@starbeam/dom";
import { JSDOM } from "jsdom";
import { ElementArgs, normalizeChild, } from "./element.js";
import { expect, Expects } from "./expect/expect.js";
import { toBe } from "./expect/patterns/comparison.js";
export function test(name, test) {
    jest.test.concurrent(name, () => {
        let support = TestSupport.create();
        return test({
            test: support,
            universe: support.universe,
            dom: support.dom,
        });
    });
}
export function todo(name, test) {
    if (test) {
        jest.test.concurrent(name, async () => {
            let support = TestSupport.create();
            try {
                await test({
                    test: support,
                    universe: support.universe,
                    dom: support.dom,
                });
            }
            catch (e) {
                return;
            }
            throw Error(`Expected pending test '${name}' to fail, but it passed`);
        });
    }
    jest.test.todo(name);
}
export class TestRoot {
    static create(root, container) {
        return new TestRoot(root, container);
    }
    #root;
    #container;
    constructor(root, container) {
        this.#root = root;
        this.#container = container;
    }
    poll() {
        this.#root.poll();
    }
    update(updater, expectation) {
        if (typeof updater === "function") {
            updater();
        }
        else {
            let [cell, value] = updater;
            cell.update(value);
        }
        this.#root.poll();
        this.#root.initialize();
        Abstraction.wrap(() => {
            expectation.assertDynamism(this.#root.metadata);
            expectation.assertContents(this.#container.innerHTML);
        }, 3);
        return this;
    }
}
export class TestSupport {
    static create(jsdom = new JSDOM()) {
        return new TestSupport(DomEnvironment.jsdom(jsdom));
    }
    universe;
    dom;
    #environment;
    constructor(environment) {
        this.#environment = environment;
        this.universe = Root.environment(environment);
        this.dom = this.universe.dom;
    }
    buildText(reactive, expectation) {
        let text = this.universe.dom.text(reactive);
        expect(text.metadata, toBe(expectation));
        return text;
    }
    buildComment(reactive, expectation) {
        let comment = this.universe.dom.comment(reactive);
        expect(comment.metadata, toBe(expectation));
        return comment;
    }
    buildElement(...args) {
        let { tagName, build, expectation } = ElementArgs.normalize(this.universe, args);
        let element = ElementProgramNodeBuilder.build(tagName, build);
        expect(element.metadata, toBe(expectation.dynamism));
        return element;
    }
    buildFragment(children, expectation) {
        let fragment = this.dom.fragment((b) => {
            for (let child of children) {
                b.append(normalizeChild(this.universe, child));
            }
        });
        expect(fragment.metadata, toBe(expectation.dynamism));
        return fragment;
    }
    render(node, expectation) {
        let element = this.#environment.document.createElementNS(HTML_NAMESPACE, "div");
        let result = this.universe.render(node, { append: element });
        verify(result, is.Present);
        if (expectation.dynamism === null) {
            throw Error(`The expectation passed to render() must include dynamism (either .constant or .dynamic)`);
        }
        expect(result.metadata, toBe(expectation.dynamism, {
            actual: result.metadata.describe(),
            expected: expectation.dynamism.describe(),
        }));
        // Exchange markers for DOM representations to allow us to compare the DOM
        // without markers to our expectations.
        result.initialize();
        Abstraction.wrap(() => {
            expectation.assertContents(element.innerHTML);
        }, 3);
        // ensure that a noop poll doesn't change the HTML output
        result.poll();
        Abstraction.wrap(() => {
            expectation.assertContents(element.innerHTML);
        }, 3);
        return TestRoot.create(result, element);
    }
}
export { expect } from "./expect/expect.js";
export { toBe } from "./expect/patterns.js";
//# sourceMappingURL=define.js.map