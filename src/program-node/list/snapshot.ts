import type { minimal } from "@domtree/flavors";
import {
  ContentCursor,
  RangeSnapshot,
  RANGE_SNAPSHOT,
} from "../../dom/streaming/cursor";
import { NonemptyList } from "../../utils";
import { OrderedIndex } from "../../utils/index-map";
import { isPresent } from "../../utils/presence";
import {
  RenderedContent,
  type RenderedContentMetadata,
} from "../interfaces/rendered-content";
import type { ContentsIndex } from "./loop";

export class RenderSnapshot {
  static verified(list: readonly KeyedContent[]): RenderSnapshot {
    return RenderSnapshot.of(NonemptyList.verify(list));
  }

  static of(list: NonemptyList<KeyedContent>): RenderSnapshot {
    return new RenderSnapshot(
      list,
      {
        isConstant: [...list].every((item) =>
          RenderedContent.isConstant(item.content)
        ),
      },
      OrderedIndex.create(list.asArray(), (keyed) => keyed.key)
    );
  }

  readonly #list: NonemptyList<KeyedContent>;

  private constructor(
    list: NonemptyList<KeyedContent>,
    readonly metadata: RenderedContentMetadata,
    readonly contents: ContentsIndex
  ) {
    this.#list = list;
  }

  range(inside: minimal.ParentNode): RangeSnapshot {
    let { first, last } = this.#list;
    let rangeA = first.content[RANGE_SNAPSHOT](inside);
    let rangeB = last.content[RANGE_SNAPSHOT](inside);

    return rangeA.join(rangeB);
  }

  adding(...content: readonly KeyedContent[]): RenderSnapshot {
    if (content.length === 0) {
      return this;
    } else {
      return RenderSnapshot.of(this.#list.pushing(...content));
    }
  }

  remove(inside: minimal.ParentNode): ContentCursor {
    return this.range(inside).remove();
  }

  getPresent(keys: readonly unknown[]): readonly KeyedContent[] {
    let contents = this.contents;
    return keys.map((key) => contents.get(key)).filter(isPresent);
  }

  get keys(): readonly unknown[] {
    return this.contents.keys;
  }

  get(key: unknown): KeyedContent | null {
    return this.contents.get(key);
  }

  poll(inside: minimal.ParentNode): void {
    for (let item of this.#list) {
      item.content.poll(inside);
    }
  }
}

export class KeyedContent {
  static create(key: unknown, content: RenderedContent): KeyedContent {
    return new KeyedContent(key, content);
  }

  private constructor(
    readonly key: unknown,
    readonly content: RenderedContent
  ) {}
}
