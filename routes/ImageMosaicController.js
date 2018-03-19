const Controller = require('./Controller');
const ImageMosaic = require(`../geoserver/ImageMosaic`);

class ImageMosaicController extends Controller {
	constructor(app, pool) {
		super(app, 'imagemosaic');

		this._imageMosaic = new ImageMosaic(
			`/mnt/pracovni-archiv-01/Sentinel-2/MSI`,
			`/data/geoserver/dromas-time-serie-data`
		);

		app.get('/rest/imagemosaic/prepare', this.prepareImageMosaicData.bind(this));
	}

	readAll(request, response, next) {
		Promise.resolve(() => {
			return this._imageMosaic.getDatesByGeometry(request.body.data.geometry);
		}).then((dates) => {
			response.status(200).json(
				{
					dates: dates
				}
			)
		}).catch((error) => {
			response.status(500).json(
				{
					status: 'err'
				}
			)
		});
	}

	prepareImageMosaicData(request, response, next) {
		Promise.resolve(() => {
			this._imageMosaic.prepareImageMosaicFsStructure();
			this._imageMosaic.prepareImageMosaicMetadata();
			this._imageMosaic.prepareImageMosaicData();
		}).then(() => {
			response.status(200).json({status: 'ok'});
		}).catch((error) => {
			response.status(500).json({status: 'err'});
		});
	}
}