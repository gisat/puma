var Controller = require('./Controller');
var logger = require('../common/Logger').applicationWideLogger;
var crud = require('../rest/crud');

/**
 * @augments Controller
 * @alias AnalysisController
 * @param app
 * @constructor
 */
var AnalysisController = function (app) {
	Controller.call(this, app, 'analysis');
};

AnalysisController.prototype = Object.create(Controller.prototype);

/**
 * @inheritDoc
 * Verify that the created analysis doesn't have attribute from the same attribute set as the source one.
 */
AnalysisController.prototype.update = function (request, response, next) {
	var analysis = request.body.data;
	var idOfTemplateForAnalysis = analysis.analysis;

	var self = this;
	crud.read('analysis', {_id: idOfTemplateForAnalysis}, {
		userId: request.userId,
		isAdmin: request.isAdmin
	}, function (err, result) {
		if (err) {
			return next(new Error("There is no analysis with given id."));
		}

		// In spatial analysis it isn't good idea to use the same attribute set for the source data and result alike.
		if (result.type == "spatialagg") {
			// Verify only when some attributes are present.
			var sourceAttributeSetIsntUsedAsResult = true;
			if (analysis.attributeMap && analysis.attributeMap.length > 0) {
				analysis.attributeMap.forEach(function (attributeToAnalyse) {
					if (attributeToAnalyse.calcAttributeSet == analysis.attributeSet || attributeToAnalyse.normAttributeSet == analysis.attributeSet) {
						sourceAttributeSetIsntUsedAsResult = false;
					}
				});
			}

			if (!sourceAttributeSetIsntUsedAsResult) {
				return next(new Error("Attributes used in the analysis as a source attribute and as a result attributes must be from different attribute sets."));
			}
		}

		Controller.prototype.update.call(self, request, response, next);
	});
};

module.exports = AnalysisController;