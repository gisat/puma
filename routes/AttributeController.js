var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;
var conn = require('../common/conn');
var Controller = require('./Controller');
var UUID = require('../common/UUID');
var moment = require('moment');

var Statistics = require('../attributes/Statistics');
var Filter = require('../attributes/Filter');

var MongoAttributes = require('../attributes/MongoAttributes');
var MongoAttribute = require('../attributes/MongoAttribute');

class AttributeController extends Controller {
    constructor(app, pgPool) {
        super(app, 'attribute', MongoAttributes, MongoAttribute);

        this._pgPool = pgPool;

        app.get('/rest/filter/attribute/statistics', this.statistics.bind(this));
        app.get('/rest/filter/attribute/filter', this.filter.bind(this));
    }

    statistics(request, response, next) {
        var uuid = new UUID().toString();
        logger.info(`AttributeController#statistics UUID: ${uuid} Start: ${moment().format()}`);
        var distribution = request.query.distribution;
        var attributesMap = {};
        request.query.attributes.forEach(
            attribute => attributesMap[`as_${attribute.attributeSet}_attr_${attribute.attribute}`] = attribute
        );
        if (distribution.type == 'normal') {
            new Statistics(request, this._pgPool).statistics().then(attributes => {
                return attributes.map(attribute => attribute.json({
                    classes: Number(distribution.classes),
                    attributeName: attributesMap[attribute.name()].attributeName,
                    attributeSetName: attributesMap[attribute.name()].attributeSetName
                }));
            }).then(json => {
                response.json({attributes: json});
                logger.info(`AttributeController#statistics UUID: ${uuid} End: ${moment().format()}`);
            }).catch(err => {
                throw new Error(
                    logger.error(`AttributeController#statistics Error: `, err)
                )
            })
        } else {
            throw new Error(
                logger.error(`AttributeController#statistics Wrong type of distribution.`)
            )
        }
    }

    filter(request, response, next) {
        var uuid = new UUID().toString();
        logger.info(`AttributeController#filter UUID: ${uuid} Start: ${moment().format()}`);

        var attributesMap = {};
        request.query.attributes.forEach(
            attribute => attributesMap[`as_${attribute.attributeSet}_attr_${attribute.attribute}`] = attribute
        );
        new Filter(request, this._pgPool).statistics().then(attributes => {
            return attributes.map(attribute => attribute.filter({
                value: attributesMap[attribute.name()].value,
                attributeName: attributesMap[attribute.name()].attributeName,
                attributeSetName: attributesMap[attribute.name()].attributeSetName
            }));
        }).then(json => {
            logger.info('AttributeController#filter JSON: ', json);
            // Get only those that are in all.
            var responseAttributes = {};
            json.forEach(filteredAreas => {
                filteredAreas.forEach(area => {
                    var key = `at_${area.at}_loc_${area.loc}_gid_${area.gid}`;
                    if(!responseAttributes[key]) {
                        responseAttributes[key] = {
                            value: 0,
                            area: area
                        }
                    }
                    responseAttributes[key].value++;
                })
            });

            var results = [];
            Object.keys(responseAttributes).forEach(key => {
                if(responseAttributes[key].value == json.length) {
                    results.push(responseAttributes[key].area);
                }
            });

            response.json(results);
            logger.info(`AttributeController#filter UUID: ${uuid} End: ${moment().format()}`);
        }).catch(err => {
            throw new Error(
                logger.error(`AttributeController#filter Error: `, err)
            )
        });
    }
}

module.exports = AttributeController;
