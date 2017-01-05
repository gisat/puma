var Controller = require('./Controller');
var MongoTopics = require('../metadata/MongoTopics');
var MongoTopic = require('../metadata/MongoTopic');

class TopicController extends Controller {
	constructor(app, pool) {
		super(app, 'topic', pool, MongoTopics, MongoTopic);
	}

    hasRights(user, method, id) {
        return user.hasPermission(this.type, method, id);
    }
}

module.exports = TopicController;