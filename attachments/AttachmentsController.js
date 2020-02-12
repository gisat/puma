let Attachments = require(`./Attachments`);

class AttachmentsController {
	constructor(app, pgPool, pgSchema) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;

		this._attachments = new Attachments(pgPool, pgSchema);

		app.get(`/rest/attachments/:key`, this.getAttachment.bind(this));
	}

	getAttachment(request, response) {
		return this._attachments
			.getAttachment(request.params.key)
			.then((attachment) => {
				if(attachment) {
					console.log(attachment);
					response.download(attachment.localPath, attachment.originalName);
				} else {
					throw new Error(`attachment not found`);
				}
			})
			.catch((error) => {
				console.log(error);
				response
					.status(500)
					.json(
						{
							"success": false,
							"message": error.message
						}
					)
			})
	}
}

module.exports = AttachmentsController;