var conn = require('../common/conn');
var Promise = require('promise');
var extent = require('geojson-extent');
var wellknown = require('wellknown');

let Attributes = require('./Attributes');

var MongoAttribute = require('../attributes/MongoAttribute');
var NumericAttribute = require('../attributes/NumericAttribute');
var TextAttribute = require('../attributes/TextAttribute');
var BooleanAttribute = require('../attributes/BooleanAttribute');

class AttributesForInfo extends Attributes {
  constructor(areaTemplate, periods, places, attributes){
    super(areaTemplate, periods, places, attributes);
  }

  attributes(sqlProducer) {
    let mongoAttributes = {};
    return Promise.all(this._attributes.map(attribute => {
      return new MongoAttribute(Number(attribute.attribute), conn.getMongoDb()).json();
    })).then(attributes => {
      attributes.forEach(attribute => {
        mongoAttributes[attribute._id] = attribute;
      });

      return this._dataViews(sqlProducer, mongoAttributes);
    }).then(dataViews => {
      let attributes = {};

      dataViews.forEach(dataView => {
        this._dataView(dataView, attributes);
      });

      let attributesPromises = Object.keys(attributes)
        .filter(attribute => attribute != 'geometry' && attribute != 'geomwgs' && attribute != 'gid' && attribute != 'location' && attribute != 'areatemplate' && attribute != 'name')
        .map(attribute => {
          var id = Number(attribute.split('_')[3]);
          let jsonAttribute = JSON.parse(JSON.stringify(mongoAttributes[id])); // deep clone of the object

          jsonAttribute.values = attributes[attribute];
          jsonAttribute.geometries = attributes['geometry'];
          jsonAttribute.geomWgs = attributes['geomwgs'];
          jsonAttribute.names = attributes['name'];
          jsonAttribute.gids = attributes['gid'];
          jsonAttribute.color = attributes['color'];
          jsonAttribute.areaTemplates = attributes['areatemplate'].map(base => Number(base));
          jsonAttribute.locations = attributes['location'].map(base => Number(base));
          jsonAttribute.column = attribute;

          if (jsonAttribute.type == 'numeric') {
            return new NumericAttribute(jsonAttribute);
          } else if (jsonAttribute.type == 'boolean') {
            return new BooleanAttribute(jsonAttribute);
          } else if (jsonAttribute.type == 'text') {
            return new TextAttribute(jsonAttribute);
          } else {
            logger.warn(`Statistics#statisticAttributes Unknown type of attribute. id: ${id}`);
            return null
          }
        })
        .filter(attribute => {
          return attribute != null
        });

      // if there are no attributes mapped for current gid
      if (attributesPromises.length === 0){
        attributesPromises.push(new Promise((resolve,reject) =>{
          let data = null;
          dataViews.map(view => {
            if (view.rows.length > 0){
              let info = view.rows[0];
              let wgsExtent = this.getExtentFromWkt(info.geomwgs);
              data = {
                gid: info.gid,
                name: info.name,
                geom: info.geometry,
                  wgsExtent: wgsExtent
              }
            }
          });
          resolve(data);
        }));
      }

      return Promise.all(attributesPromises);
    });
  }

  getExtentFromWkt(geometry){
      let json = wellknown(geometry);
      return extent(json);
  }
}

module.exports = AttributesForInfo;