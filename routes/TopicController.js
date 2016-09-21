var Controller = require('./Controller');
var MongoTopics = require('../metadata/MongoTopics');
var MongoTopic = require('../metadata/MongoTopic');

class TopicController extends Controller {
	constructor(app) {
		super(app, 'topic', MongoTopics, MongoTopic);
	}
}

module.exports = TopicController;