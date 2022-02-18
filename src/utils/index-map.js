export class OrderedIndex {
    map;
    list;
    key;
    static create(list, key) {
        let map = new Map();
        for (let item of list) {
            map.set(key(item), item);
        }
        return new OrderedIndex(map, list, key);
    }
    static empty(key) {
        return OrderedIndex.create([], key);
    }
    constructor(map, list, key) {
        this.map = map;
        this.list = list;
        this.key = key;
    }
    [Symbol.iterator]() {
        return this.list[Symbol.iterator]();
    }
    *entries() {
        for (let item of this.list) {
            let key = this.key(item);
            yield [key, item];
        }
    }
    get keys() {
        return this.list.map(this.key);
    }
    has(key) {
        return this.map.has(key);
    }
    get(key) {
        return this.map.get(key) ?? null;
    }
    mergedMap(other) {
        let key = this.key;
        let mergedList = [...mergeUniqueLists(this.list, other.list)];
        return new Map(mergedList.map((item) => [key(item), item]));
    }
}
function mergeUniqueLists(a, b) {
    return new Set([...a, ...b]);
}
// class PresentOrderedIndex<K, V> extends OrderedIndex<K, V> {
//   static build<K, V>(key: (value: V) => K): PresentOrderedIndex<K, V> {
//     return PresentOrderedIndex.of([], key) as PresentOrderedIndex<K, V>;
//   }
//   static of<K, V>(list: V[], key: (value: V) => K): OrderedIndex<K, V> {
//     let map: Map<K, V> = new Map();
//     for (let item of list) {
//       map.set(key(item), item);
//     }
//     return new PresentOrderedIndex(map, list, key);
//   }
//   private constructor(
//     readonly map: Map<K, V>,
//     readonly list: V[],
//     key: (value: V) => K
//   ) {
//     super(key);
//   }
// }
//# sourceMappingURL=index-map.js.map