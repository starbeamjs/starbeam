import { ContentCursor, RangeSnapshot, RANGE_SNAPSHOT, } from "../../dom/streaming/cursor.js";
import { ConstantMetadata, DynamicMetadata, HasMetadata, ReactiveMetadata, } from "../../core/metadata.js";
export class RenderedContent extends HasMetadata {
    static isConstant(rendered) {
        return rendered.metadata === ReactiveMetadata.Constant;
    }
    static isUpdating(rendered) {
        return !RenderedContent.isConstant(rendered);
    }
    remove(inside) {
        let range = this[RANGE_SNAPSHOT](inside);
        return range.remove();
    }
    move(to) {
        let range = this[RANGE_SNAPSHOT](to.parent);
        range.move(to);
    }
}
//# sourceMappingURL=rendered-content.js.map