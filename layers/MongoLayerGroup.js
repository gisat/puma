/**
 * Created by jbalhar on 13. 9. 2016.
 */
// areaTemplate contains the Layer group.
// Otherwise it is single
class MongoLayerGroup {
	constructor(id, connection) {
		this._id = id;
		this._connection = connection;
	}



	static collectionName() {
		return "layergroup";
	}
}