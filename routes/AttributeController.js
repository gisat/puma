var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;
var conn = require('../common/conn');
var Controller = require('./Controller');
var UUID = require('../common/UUID');
var _ = require('underscore');
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
        app.get('/rest/filter/attribute/amount', this.amount.bind(this));
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
            var result = _.flatten(json);
            logger.info('AttributeController#filter JSON rows: ', result.length);
            // Get only those that are in all.

            response.json(result);
            logger.info(`AttributeController#filter UUID: ${uuid} End: ${moment().format()}`);
        }).catch(err => {
            throw new Error(
                logger.error(`AttributeController#filter Error: `, err)
            )
        });
    }

    amount(request, response, next) {
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
            var result = _.flatten(json);
            logger.info('AttributeController#filter JSON rows: ', result.length);
            // Get only those that are in all.

            response.json({amount: result.length});
            logger.info(`AttributeController#filter UUID: ${uuid} End: ${moment().format()}`);
        }).catch(err => {
            throw new Error(
                logger.error(`AttributeController#filter Error: `, err)
            )
        });
    }
}

module.exports = AttributeController;
