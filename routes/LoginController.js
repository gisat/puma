var logger = require('../common/Logger').applicationWideLogger;

let Geonode = require('../security/Geonode');
let Unauthorized = require('../security/Unauthorized');

/**
 * Controller for handling the login and logout of the user from the system. Internally this implementation uses Geonode
 * to log the user in.
 */
class LoginController {
	constructor(app) {
		if (!app) {
			throw new Error(logger.error("LoginController#constructor The controller must receive valid app."));
		}
		app.get("/rest/logged", this.logged.bind(this));
		app.post("/api/login/login", this.login.bind(this));
		app.post("/api/login/logout", this.logout.bind(this));
		app.post("/api/login/getLoginInfo", this.getLoginInfo.bind(this));

		this.geonode = new Geonode();
	}

	logged(request, response) {
		// It is possible that nobody will be logged. In this case return 404
		if(request.session.user) {
			response.json(request.session.user.json());
		} else {
			response.status(404);
			response.json({status: 'Nobody is logged in.'});
		}
	}

	login(request, response, next) {
		var username = request.body.username;
		var password = request.body.password;
		return new Promise((resolve) => {
			// Destroy current and create a new session.
			request.session.regenerate(resolve);
		}).then(() => {
			// Log in geonode.
			return this.geonode.login(username, password);
		}).then((parsedCookies) => {
			if (parsedCookies instanceof Unauthorized) {
				response.status(401).end();
			} else {
				// Fetch user info from geonode.
				return this.geonode.fetchUserInfo(username)
				.then(function (userInfo) {
					// Set userInfo into session data.
					Object.assign(request.session, userInfo);

					// Proxy geonode cookies to user agent.
					for (let name in parsedCookies) {
						response.set("Set-Cookie", parsedCookies[name].headerLine);
					}

					// Set JSON response data.
					// FIXME: The complicated data structure is here due to old FrontOffice.
					response.status(200).json({
						data: {
							status: "ok",
							ssid: parsedCookies["sessionid"].value,
							csrfToken: parsedCookies["csrftoken"].value
						},
						success: true
					});
				})
			}
		}).catch(function (err) {
			next(err);
		});
	}

	logout(request, response, next) {
		return new Promise(function (resolve) {
			// Destroy current session.
			request.session.destroy(resolve);
		}).then(() => {
			return this.geonode.logout(request.get('Cookie'))
		}).then(() => {
			// FIXME: The complicated data structure is here due to FrontOffice.
			response.status(200).json({success: true});
		}).catch(function (err) {
			next(err);
		});
	}

	getLoginInfo(request, response) {
		if (request.session.userId) {
			// FIXME: The complicated data structure is here due to FrontOffice.
			response.status(200).json({
				data: {
					userId: request.session.userId,
					userName: request.session.userName,
					groups: request.session.groups
				},
				success: true
			});
		} else {
			response.status(200).json({});
		}
	}
}


module.exports = LoginController;
