let Intersection = require('./common/Intersection');

/**
 * @alias PropertyIsGreaterThan
 * @augments Intersection
 * @param children {Node[]}
 * @constructor
 */
class PropertyIsGreaterThan extends Intersection {
    constructor(children) {
        super('ogc:PropertyIsGreaterThan', children);
    }

    /**
     * @inheritDoc
     */
    validChildren() {
        return ['ogc:PropertyName','ogc:Literal'];
    }
}

module.exports = PropertyIsGreaterThan;