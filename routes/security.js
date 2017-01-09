var AuthController = require("./AuthController");

module.exports = function(app) {
	var authController = new AuthController();
	app.put('/rest/*', authController.anyUser.bind(authController));
	app.delete('/rest/*', authController.anyUser.bind(authController));
};
