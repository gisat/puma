const Controller = require('./Controller');
const ImageMosaic = require(`../geoserver/ImageMosaic`);

const config = require(`../config`);

class ImageMosaicController {
	constructor(app) {
		this._imageMosaic = new ImageMosaic(
			config.dromasLpis.pathTo2SScenes,
			config.dromasLpis.pathToImageMosaicDirectory,
			config.dromasLpis.imageMosaicPgStorage,
			config.dromasLpis.groupBy,
			config.dromasLpis.enabled,
		);

		app.post('/rest/imagemosaic/getDates', this.getDatesByGeometry.bind(this));
	}

	getDatesByGeometry(request, response, next) {
		Promise.resolve().then(() => {
			return this._imageMosaic.getDatesByGeometry(request.body.data.geometry);
		}).then((dates) => {
			response.status(200).json(
				{
					dates: dates
				}
			)
		}).catch((error) => {
			console.log(`ImageMosaicController#getDatesByGeometry: ERR`, error);
			response.status(500).json(
				{
					status: 'err'
				}
			)
		});
	}
}

module.exports = ImageMosaicController;