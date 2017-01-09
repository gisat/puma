var Controller = require('./Controller');
var MongoTopics = require('../metadata/MongoTopics');
var MongoTopic = require('../metadata/MongoTopic');

class TopicController extends Controller {
	constructor(app, pool) {
		super(app, 'topic', pool, MongoTopics, MongoTopic);
	}

	/**
	 * Verify that the user has rights to create Topics.
	 * @inheritDoc
	 */
	create(request, response, next) {
		if (!request.session.user.hasPermission(this.type, 'POST', null)) {
			response.status(403);
			return;
		}

		super.create(request, response, next);
	}

    hasRights(user, method, id) {
        return user.hasPermission(this.type, method, id);
    }
}

module.exports = TopicController;