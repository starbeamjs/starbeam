import { ReactiveMetadata } from "../../core/metadata.js";
import { NonemptyList } from "../../utils.js";
import { OrderedIndex } from "../../utils/index-map.js";
import { isPresent } from "../../utils/presence.js";
import { RenderedContent } from "../interfaces/rendered-content.js";
export class RenderSnapshot {
    metadata;
    contents;
    static from(list) {
        if (list.length === 0) {
            return RenderSnapshot.of(null);
        }
        return RenderSnapshot.of(NonemptyList.verified(list));
    }
    static of(list) {
        if (list === null) {
            return new RenderSnapshot(null, ReactiveMetadata.Constant, OrderedIndex.empty((keyed) => keyed.key));
        }
        let isConstant = [...list].every((item) => RenderedContent.isConstant(item.content));
        return new RenderSnapshot(list, isConstant ? ReactiveMetadata.Constant : ReactiveMetadata.Dynamic, OrderedIndex.create(list.asArray(), (keyed) => keyed.key));
    }
    #list;
    constructor(list, metadata, contents) {
        this.metadata = metadata;
        this.contents = contents;
        this.#list = list;
    }
    isEmpty() {
        return this.#list === null;
    }
    adding(...content) {
        if (content.length === 0) {
            return this;
        }
        else if (this.#list === null) {
            return RenderSnapshot.from(content);
        }
        else {
            return RenderSnapshot.of(this.#list.pushing(...content));
        }
    }
    get boundaries() {
        if (this.#list) {
            return [this.#list.first, this.#list.last];
        }
        else {
            return null;
        }
    }
    getPresent(keys) {
        let contents = this.contents;
        return keys.map((key) => contents.get(key)).filter(isPresent);
    }
    get keys() {
        return this.contents.keys;
    }
    get(key) {
        return this.contents.get(key);
    }
    initialize(inside) {
        if (this.#list) {
            for (let item of this.#list) {
                item.content.initialize(inside);
            }
        }
    }
    poll(inside) {
        if (this.#list) {
            for (let item of this.#list) {
                item.content.poll(inside);
            }
        }
    }
}
export class KeyedContent {
    key;
    content;
    static create(key, content) {
        return new KeyedContent(key, content);
    }
    constructor(key, content) {
        this.key = key;
        this.content = content;
    }
}
//# sourceMappingURL=snapshot.js.map