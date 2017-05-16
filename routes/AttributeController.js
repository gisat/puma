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
    constructor(app, pgPool, pgPoolRemote, viewsSchema) {
        super(app, 'attribute', pgPool, MongoAttributes, MongoAttribute);

        this._pgPool = pgPoolRemote || pgPool;

        this._statistics = new Statistics(pgPoolRemote || pgPool, viewsSchema);
        this._filter = new Filter(pgPoolRemote || pgPool, viewsSchema);
        this._info = new Info(pgPoolRemote || pgPool);

        app.post('/rest/filter/attribute/statistics', this.statistics.bind(this));
        app.post('/rest/filter/attribute/filter', this.filter.bind(this));
        app.post('/rest/filter/attribute/amount', this.amount.bind(this));

        app.post('/rest/info/attribute', this.info.bind(this));
    }

	/**
	 * It returns max, min and distribution for all areas provided in the request and for the combination of areaTemplate,
     * periods and places.
     * Attributes also contain attribute name, attribute set name, units and active which are returned back.
	 * @param request
	 * @param response
	 */
	statistics(request, response) {
        var options = this._parseRequest(request.body);
        var uuid = new UUID().toString();
        logger.info(`AttributeController#statistics UUID: ${uuid} Start: ${moment().format()} Attributes: `, options.attributes);
        var distribution = request.body.distribution;

        let attributes = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);
        this._statistics.statistics(attributes, options.attributesMap, distribution).then(json => {
            response.json({attributes: json});
            logger.info(`AttributeController#statistics UUID: ${uuid} End: ${moment().format()}`);
        }).catch(err => {
			response.status(500).json({status: 'err', message: err});
			throw new Error(
                logger.error(`AttributeController#statistics Error: `, err)
            )
        })
    }

    filter(request, response) {
        var options = this._parseRequest(request.body);
        var uuid = new UUID().toString();
        logger.info(`AttributeController#filter UUID: ${uuid} Start: ${moment().format()}`);

        let attributes = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);
        this._filter.statistics(attributes, options.attributesMap, options.attributes).then(json => {
            let result = this._deduplicate(_.flatten(json), json.length);
            response.json(result);
            logger.info(`AttributeController#filter UUID: ${uuid} End: ${moment().format()}`);
        }).catch(err => {
            response.status(500).json({status: 'err', message: err});
            throw new Error(
                logger.error(`AttributeController#filter Error: `, err)
            )
        });
    }

	/**
     * It returns amount of areas which satisfy all limitations passed as the part of the result. There is always only one
     * number. If there is issue 500 is returned.
	 * @param request
	 * @param response
	 */
	amount(request, response) {
        var options = this._parseRequest(request.body);
        var uuid = new UUID().toString();
        logger.info(`AttributeController#amount UUID: ${uuid} Start: ${moment().format()}`);

        let attributes = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);
        this._filter.statistics(attributes, options.attributesMap, options.attributes).then(json => {
            let result = this._deduplicate(_.flatten(json), json.length);
            response.json({amount: result.length});
            logger.info(`AttributeController#amount UUID: ${uuid} End: ${moment().format()}`);
        }).catch(err => {
			response.status(500).json({status: 'err', message: err});
			throw new Error(
                logger.error(`AttributeController#amount Error: `, err)
            )
        });
    }

    _parseRequest(params) {
        let attributes;
        if (!params.isArray){
            attributes = _.toArray(params.attributes);
        } else {
            attributes = params.attributes;
        }

        var attributesMap = {};
        attributes.forEach(
            attribute => attributesMap[`as_${attribute.attributeSet}_attr_${attribute.attribute}`] = attribute
        );
        return {
            attributes: attributes,
            attributesMap: attributesMap,
            areaTemplate: Number(params.areaTemplate),
            periods: params.periods.map(period => Number(period)),
            places: params.places.map(place => Number(place))
        };
    }

    /**
     * Returns values for received attributes for specific polygon.
     * @param request
     * @param response
     */
    info(request, response) {
        var options = this._parseRequest(request.body);
        let gid = request.body.gid;
        var uuid = new UUID().toString();
        logger.info(`AttributeController#info UUID: ${uuid} Start: ${moment().format()}`);

        let attributesObj = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);
        this._info.statistics(attributesObj, options.attributesMap, gid).then(json => {
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
