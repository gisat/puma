var FilteredMongoLayerReferences = require('../layers/FilteredMongoLayerReferences');
var FilteredMongoLayerTemplate = require('../layers/FilteredMongoLayerTemplate');
var FilteredMongoAttributeSets = require('../attributes/FilteredMongoAttributeSets');
var MongoLayerTemplate = require('../layers/MongoLayerTemplate');
var FilteredMongoAttributes = require('../attributes/FilteredMongoAttributes');
var MongoLocation = require('../metadata/MongoLocation');
var conn = require('../common/conn');
var Promise = require('promise');
var _ = require('lodash');

class PlaceTemplates {
    constructor(place) {
        this._place = place;
    }

    getPlaceTemplates() {
        var data = [];

        return new MongoLocation(this._place, conn.getMongoDb()).json().then(mongoPlace => {
            return mongoPlace.dataset;
        }).then(scopeId => {
            return new FilteredMongoLayerTemplate({scope: scopeId}, conn.getMongoDb()).json();
        }).then(mongoLayerTemplates => {
            for(var layerTemplate of mongoLayerTemplates){
                data.push({
                    _id: layerTemplate._id
                })
            }
            return { data: data, success: true };
        });
    }
}

module.exports = PlaceTemplates;