var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { cached, Memo, reactive, Root } from "@starbeam/core";
import { expect, test, toBe } from "../support/define.js";
import { Dynamism, Expects } from "../support/expect/expect.js";
test("universe.memo", () => {
    class Person {
        name;
        country;
        constructor(name, country) {
            this.name = name;
            this.country = country;
        }
        formatted(country = true) {
            if (country) {
                return `${this.name} (${this.country})`;
            }
            else {
                return this.name;
            }
        }
    }
    __decorate([
        reactive
    ], Person.prototype, "name", void 0);
    __decorate([
        reactive
    ], Person.prototype, "country", void 0);
    let person = new Person("Tom", "USA");
    let counter = 0;
    let formatted = Memo(() => {
        counter++;
        return person.formatted(false);
    });
    expect(formatted.current, toBe("Tom"));
    expect(counter, toBe(1));
    expect(formatted.current, toBe("Tom"));
    expect(counter, toBe(1));
    person.name = "Thomas";
    expect(formatted.current, toBe("Thomas"));
    expect(counter, toBe(2));
});
test("nested universe.memo", ({ universe }) => {
    let person = testName(universe, "Tom", "Dale");
    expect(person.fullName, toBe("Tom Dale"));
    person.firstName = "Thomas";
    expect(person.fullName, toBe("Thomas Dale"));
});
test("universe.memo => text", ({ universe, test }) => {
    let person = testName(universe, "Tom", "Dale");
    let text = test.buildText(Memo(() => person.fullName), Dynamism.dynamic);
    test
        .render(text, Expects.dynamic.html("Tom Dale"))
        .update(() => (person.firstName = "Thomas"), Expects.html("Thomas Dale"));
});
function testName(universe, first, last) {
    class Person {
        firstName;
        lastName;
        constructor(first, last) {
            this.firstName = first;
            this.lastName = last;
        }
        get firstNameMemo() {
            return this.firstName;
        }
        get lastNameMemo() {
            return this.lastName;
        }
        get fullName() {
            return `${this.firstNameMemo} ${this.lastNameMemo}`;
        }
    }
    __decorate([
        reactive
    ], Person.prototype, "firstName", void 0);
    __decorate([
        reactive
    ], Person.prototype, "lastName", void 0);
    __decorate([
        cached
    ], Person.prototype, "firstNameMemo", null);
    __decorate([
        cached
    ], Person.prototype, "lastNameMemo", null);
    __decorate([
        cached
    ], Person.prototype, "fullName", null);
    return new Person(first, last);
}
//# sourceMappingURL=reactive.spec.js.map