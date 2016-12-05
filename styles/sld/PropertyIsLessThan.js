let Intersection = require('./common/Intersection');

/**
 * @alias PropertyIsLessThan
 * @augments Intersection
 * @param children {Node[]}
 * @constructor
 */
class PropertyIsLessThan extends Intersection {
    constructor(children) {
        super('ogc:PropertyIsLessThan', children);
    }

    /**
     * @inheritDoc
     */
    validChildren() {
        return ['ogc:PropertyName','ogc:Literal'];
    }
}

module.exports = PropertyIsLessThan;