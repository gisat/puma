var auth = require('../common/auth');

module.exports = function(app) {
	app.put('/rest/*', auth.anyUser);
	app.delete('/rest/*', auth.anyUser);
};
