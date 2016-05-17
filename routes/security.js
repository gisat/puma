var auth = require('../common/auth');

module.exports = function(app) {


	app.post('/rest/*',auth.anyone);
	app.put('/rest/*',auth.auth,auth.anyUser);
	app.delete('/rest/*',auth.auth,auth.anyUser);
	app.get('/rest/*',auth.auth);
	app.all('/api/urlview/saveChart',auth.auth);
	app.all('/api/*',auth.auth);
};
