var crud = require('../rest/crud');
var logger = require('../common/Logger').applicationWideLogger;
var conn = require('../common/conn');
var Controller = require('./Controller');
var UUID = require('../common/UUID');
var _ = require('underscore');
var moment = require('moment');
let Promise = require('promise');

let FilteredBaseLayers = require('../layers/FilteredBaseLayers');
var Statistics = require('../attributes/Statistics');
var Filter = require('../attributes/Filter');
var Attributes = require('../attributes/Attributes');
var AttributesForInfo = require('../attributes/AttributesForInfo');
var Info = require('../attributes/Info');
let PgSequentialQuery = require('../postgresql/PgSequentialQuery');

var MongoAttributes = require('../attributes/MongoAttributes');
var MongoAttribute = require('../attributes/MongoAttribute');

class AttributeController extends Controller {
    constructor(app, pgPool, pgPoolRemote, mongo, viewsSchema) {
        super(app, 'attribute', pgPool, MongoAttributes, MongoAttribute);

        this._pgPool = pgPoolRemote || pgPool;
        this._mongo = mongo;

        this._statistics = new Statistics(pgPoolRemote || pgPool, viewsSchema);
        this._filter = new Filter(pgPoolRemote || pgPool, viewsSchema);
        this._info = new Info(pgPoolRemote || pgPool, viewsSchema);

        app.post('/rest/filter/attribute/statistics', this.statistics.bind(this));
        app.post('/rest/filter/attribute/filter', this.filter.bind(this));
        app.post('/rest/filter/attribute/amount', this.amount.bind(this));

        app.post('/rest/info/attribute', this.info.bind(this));
        app.post('/rest/info/bboxes', this.getBoundingBox.bind(this));
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
     * The sql here doesnt need geometry.
	 * @param request
	 * @param response
	 */
	amount(request, response) {
        var options = this._parseRequest(request.body);
        var uuid = new UUID().toString();
        logger.info(`AttributeController#amount UUID: ${uuid} Start: ${moment().format()}`);

        // When I ask for multiple periods, it is the only time, where it actually needs the deduplication and stuff.
        // Otherwise it is actually quite simple.
		let attributes = new Attributes(options.areaTemplate, options.periods, options.places, options.attributes);
		if(options.periods.length > 1) {
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
		} else {
        	this._filter.amount(attributes, options.attributes).then(amount => {
				response.json({amount: amount});

				logger.info(`AttributeController#amount UUID: ${uuid} End: ${moment().format()}`);
			}).catch(err => {
				response.status(500).json({status: 'err', message: err});
				throw new Error(
					logger.error(`AttributeController#amount Error: `, err)
				)
			});
        }
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

        let attributesObj = new AttributesForInfo(options.areaTemplate, options.periods, options.places, options.attributes);
        this._info.statistics(attributesObj, options.attributesMap, gid).then(json => {
            response.json(json);
            logger.info(`AttributeController#info UUID: ${uuid} End: ${moment().format()}`);
        }).catch(err => {
            response.status(500).json({status: 'err', message: err});
            throw new Error(
                logger.error(`AttributeController#info Error: `, err)
            )
        });

    }

    /**
     * Get bounding box for given areas
     * @param request
     * @param response
     */
    getBoundingBox(request,response){
        let areas = request.body.areas;
        let periods = request.body.periods;
        let promises = [];

        if (!areas){
            response.json({
                status: "error",
                message: "No selected area!"
            });
        }

        areas.map(locationObj => {
            let areaTemplate = locationObj.at;
            let options = this._parseRequestForBoundingBox(areaTemplate, locationObj.loc, periods);
            let attributesObj = new AttributesForInfo(options.areaTemplate, options.periods, options.places, options.attributes);
            promises.push(this._info.getBoundingBoxes(attributesObj, locationObj.gids));
        });

        let self = this;
        Promise.all(promises).then(function(result){
            let extents = [];
            if (result && result.length){
                result.map(areas => {
                    areas.map(extent => {
                       extents.push(extent);
                    });
                });
            } else {
                response.json({
                    status: "error",
                    message: "No selected area!"
                });
            }
            return extents;
        }).catch(err => {
            response.status(500).json({status: 'err', message: err});
            throw new Error(
                logger.error(`AttributeController#getBoundingBox Error: `, err)
            )
        }).then(function(extents){
            if (extents.length){
                let points = [];
                extents.map(extent => {
                    extent.map(coord => {
                       points.push(coord);
                    });
                });
                let bbox = self._info.getExtentFromPoints(points);
                response.json({
                   status: "ok",
                   bbox: bbox
                });
            }
        }).catch(err => {
            response.status(500).json({status: 'err', message: err});
            throw new Error(
                logger.error(`AttributeController#getBoundingBox Error: `, err)
            )
        });
    }

    _parseRequestForBoundingBox(areaTemplate, location, periods) {
        let attributes = [];
        let attributesMap = {};
        attributes.forEach(
            attribute => attributesMap[`as_${attribute.attributeSet}_attr_${attribute.attribute}`] = attribute
        );
        return {
            attributes: attributes,
            attributesMap: attributesMap,
            areaTemplate: Number(areaTemplate),
            periods: periods.map(period => Number(period)),
            places: [Number(location)]
        };
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
            places: params.places && params.places.map(place => Number(place)) || []
        };
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
