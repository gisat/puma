var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;
var conn = require('../common/conn');
var Controller = require('./Controller');
var UUID = require('../common/UUID');
var _ = require('underscore');
var moment = require('moment');

var Statistics = require('../attributes/Statistics');
var Filter = require('../attributes/Filter');
var Attributes = require('../attributes/Attributes');
var Info = require('../attributes/Info');

var MongoAttributes = require('../attributes/MongoAttributes');
var MongoAttribute = require('../attributes/MongoAttribute');

class AttributeController extends Controller {
    constructor(app, pgPool) {
        super(app, 'attribute', MongoAttributes, MongoAttribute);

        this._pgPool = pgPool;

        this._statistics = new Statistics(pgPool);
        this._filter = new Filter(pgPool);
        this._info = new Info(pgPool);

        app.get('/rest/filter/attribute/statistics', this.statistics.bind(this));
        app.get('/rest/filter/attribute/filter', this.filter.bind(this));
        app.get('/rest/filter/attribute/amount', this.amount.bind(this));
        app.get('/rest/info/attribute', this.info.bind(this));
    }

    statistics(request, response) {
        var options = this._parseRequest(request);
        var uuid = new UUID().toString();
        logger.info(`AttributeController#statistics UUID: ${uuid} Start: ${moment().format()} Attributes: `, options.attributes);
        var distribution = request.query.distribution;

        let attributes = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);
        this._statistics.statistics(attributes, options.attributesMap, distribution).then(json => {
            response.json({attributes: json});
            logger.info(`AttributeController#statistics UUID: ${uuid} End: ${moment().format()}`);
        }).catch(err => {
            throw new Error(
                logger.error(`AttributeController#statistics Error: `, err)
            )
        })
    }

    filter(request, response) {
        var options = this._parseRequest(request);
        var uuid = new UUID().toString();
        logger.info(`AttributeController#filter UUID: ${uuid} Start: ${moment().format()}`);

        let attributes = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);
        this._filter.statistics(attributes, options.attributesMap, options.attributes).then(json => {
            let result = this._deduplicate(_.flatten(json), json.length);
            response.json(result);
            logger.info(`AttributeController#filter UUID: ${uuid} End: ${moment().format()}`);
        }).catch(err => {
            throw new Error(
                logger.error(`AttributeController#filter Error: `, err)
            )
        });
    }

    amount(request, response) {
        var options = this._parseRequest(request);
        var uuid = new UUID().toString();
        logger.info(`AttributeController#amount UUID: ${uuid} Start: ${moment().format()}`);

        let attributes = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);
        this._filter.statistics(attributes, options.attributesMap, options.attributes).then(json => {
            let result = this._deduplicate(_.flatten(json), json.length);
            response.json({amount: result.length});
            logger.info(`AttributeController#amount UUID: ${uuid} End: ${moment().format()}`);
        }).catch(err => {
            throw new Error(
                logger.error(`AttributeController#amount Error: `, err)
            )
        });
    }

    _parseRequest(request) {
        let attributes = _.toArray(request.query.attributes);

        var attributesMap = {};
        attributes.forEach(
            attribute => attributesMap[`as_${attribute.attributeSet}_attr_${attribute.attribute}`] = attribute
        );
        return {
            attributes: attributes,
            attributesMap: attributesMap,
            areaTemplate: Number(request.query.areaTemplate),
            periods: request.query.periods.map(period => Number(period)),
            places: request.query.places.map(place => Number(place))
        };
    }

    /**
     * Returns values for received attributes for specific polygon.
     * @param request
     * @param response
     * @param next
     */
    info(request, response, next) {
        let location = Number(request.query.location);
        let year = Number(request.query.year);
        let areaTemplate = Number(request.query.areaTemplate);
        let gid = Number(request.query.gid);
        // Get Base layer. There will be just one.
        let attributes = _.toArray(request.query.attributes);
        var attributesMap = {};

        attributes.forEach(
            attribute => attributesMap[`as_${attribute.attributeSet}_attr_${attribute.attribute}`] = attribute
        );

        var uuid = new UUID().toString();
        logger.info(`AttributeController#info UUID: ${uuid} Start: ${moment().format()}`);

        let attributesObj = new Attributes(areaTemplate, [year], [location], attributes);
        this._info.statistics(attributesObj, attributesMap, gid).then(json => {
            response.json(json);
            logger.info(`AttributeController#info UUID: ${uuid} End: ${moment().format()}`);
        }).catch(err => {
            throw new Error(
                logger.error(`AttributeController#info Error: `, err)
            )
        });

    }

    /**
     * Simply removes duplicates from the result.
     * @param result {Array}
     * @param amountOfDuplicated Amount of filter criteria.
     * @returns {Array}
     * @private
     */
    _deduplicate(result, amountOfDuplicated) {
        let groupedInformation = _.groupBy(result, element => `${element.at}_${element.gid}_${element.loc}`);
        return Object.keys(groupedInformation).map(key => {
            return groupedInformation[key] &&
                groupedInformation[key].length == amountOfDuplicated &&
                groupedInformation[key].length &&
                groupedInformation[key][0] ||
                null;
        })
    }
}

module.exports = AttributeController;
