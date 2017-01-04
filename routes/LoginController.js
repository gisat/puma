var superagent = require("superagent");
var Url = require("url").Url;

var config = require("../config");
var conn = require('../common/conn');
var logger = require('../common/Logger').applicationWideLogger;


function getGeonodeHomeUrl(config) {
	var homeUrl = new Url();
	homeUrl.protocol = config.geonodeProtocol;
	homeUrl.hostname = config.geonodeHost;
	homeUrl.port = config.geonodePort;
	homeUrl.pathname = config.geonodeHome;
	return homeUrl;
}

function parseSetCookieHeaders(headerLines) {
	var cookies = {};
	for (let headerLine of headerLines) {
		// Parse the Set-Cookie header line into key value pairs.
		let cookie_pairs = [];
		for (let pair of headerLine.split(";")) {
			let parts = pair.split("=");
			let key = parts.shift().trim();
			let value = true;
			if (parts.length >= 1) {
				value = parts.join("=").trim();
			}
			cookie_pairs.push([key, value]);
		}

		// Extract name, value and attributes.
		let [name, value] = cookie_pairs.shift();
		let attributes = {};
		for (let [key, value] of cookie_pairs) {
			attributes[key] = value;
		}

		// Add the cookie object to cookies index.
		cookies[name] = {
			name: name,
			value: value,
			attributes: attributes,
			headerLine: headerLine
		}
	}
	return cookies;
}

function formatCookieHeader(cookies) {
	var pairs = Object.keys(cookies).map(key => {
		return key + "=" + cookies[key].value;
	});
	var headerLine = pairs.join("; ");
	return headerLine;
}

function geonodeLogin(username, password, geonodeHomeUrl) {
	var layersUrl = geonodeHomeUrl.resolveObject("/layers/");
	var loginUrl = geonodeHomeUrl.resolveObject("/account/login/");
	var refererUrl = geonodeHomeUrl.resolveObject("/");
	var cookies = {};
	// During login request to geonode csrftoken must have been already established .
	// So we dig Geonode in order to obtain one.
	return superagent.get(layersUrl.format())
		.set("Referer", refererUrl.format())
		.redirects(0)
		.then(function (res) {
			// Extract cookies together with csrftoken.
			cookies = parseSetCookieHeaders(res.headers["set-cookie"]);
			if (!cookies.hasOwnProperty("csrftoken")) {
				throw new Error("Missing csrftoken cookie in geonode response to /layers.")
			}

			// Send login request.
			return superagent.post(loginUrl.format())
				.type("form-data")
				.send({
					username: username,
					password: password,
					csrfmiddlewaretoken: cookies.csrftoken.value,
					next: ''
				})
				.redirects(0)
				.set('Referer', refererUrl.format())
				.set('Cookie', formatCookieHeader(cookies))
				.then(function (res) {
					// Status code 200 OK represents failure in Geonode.
					// Other success status codes are unknown.
					if (res.status == 200) {
						return new Unauthorized();
					} else {
						throw new Error(logger.error(`Unhandled status code ${res.status} in geonode login response.`));
					}
				}).catch(function (err) {
					// Status code 302 Found represents successful login in Geonode.
					// Other err status codes are unknown.
					if (err.response.status == 302) {
						let new_cookies = parseSetCookieHeaders(err.response.headers["set-cookie"]);
						Object.assign(cookies, new_cookies);
						if (!cookies.hasOwnProperty("csrftoken")) {
							throw new Error("Missing csrftoken cookie in geonode login response.");
						} else if (!cookies.hasOwnProperty("sessionid")) {
							throw new Error("Missing sessionid cookie in geonode login response.");
						} else {
							return cookies;
						}
					} else {
						throw new Error(logger.error(`Unhandled status code ${err.response.status} or other error in geonode login response, err=${err}.`));
					}
				});
		});
}

function geonodeLogout(cookieHeaderLine, geonodeHomeUrl) {
	var logoutUrl = geonodeHomeUrl.resolveObject("/account/logout/");
	var refererUrl = geonodeHomeUrl.resolveObject("/");
	return superagent.post(logoutUrl.format())
		.type('form')
		.set('Referer', refererUrl.format())
		.set('Cookie', cookieHeaderLine)
		.redirects(0)
		.then(function (res) {
			throw new Error(logger.error(`Unhandled status code ${res.status} in geonode logout response.`));
		}).catch(function (err) {
			// Status code 302 Found represents successful logout in Geonode.
			// Status code 403 Forbidden represents expired csrf token.
			// Other err status codes are unknown.
			if (err.response.status == 302 || err.response.status == 403) {
				return true;
			} else {
				throw new Error(logger.error(`Unhandled status code ${err.response.status} or other error in geonode logout response, err=${err}.`));
			}
		});
}

function geonodeFetchUserInfo (username) {
	var client = conn.getPgGeonodeDb();
	var sql = 'SELECT p.id AS userid, g.name AS groupname'
		+ ' FROM people_profile p '
		+ ' LEFT JOIN people_profile_groups pg ON pg.profile_id = p.id'
		+ ' LEFT JOIN auth_group g ON pg.group_id = g.id '
		+ ' WHERE p.username = $1';

	return new Promise(function (resolve) {
		client.query(sql, [username], function (err, result) {
			if (err) {
				throw new Error(logger.error(`Error querying user in geonode, sql=${sql}, err=${err}.`));
			}
			var userid = null;
			var groups = [];
			for (let row of result.rows) {
				if (row.groupname) {
					groups.push(row.groupname);
				}
				userid = userid || row.userid;
			}
			if (!userid) {
				throw new Error(logger.error(`No such user in geonode, username=${username}.`));
			}
			var userInfo = {
				userId: userid,
				userName: username,
				groups: groups
			};
			resolve(userInfo);
		});
	});
};


class Unauthorized {}


class LoginController {
	constructor(app) {
		if (!app) {
			throw new Error(logger.error("LoginController#constructor The controller must receive valid app."));
		}
		app.get("/rest/logged", this.logged.bind(this));
		app.post("/api/login/login", this.login.bind(this));
		app.post("/api/login/logout", this.logout.bind(this));
		app.post("/api/login/getLoginInfo", this.getLoginInfo.bind(this));
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
		var geonodeHomeUrl = getGeonodeHomeUrl(config);
		return new Promise(function (resolve) {
			// Destroy current and create a new session.
			request.session.regenerate(resolve);
		}).then(function () {
			// Log in geonode.
			return geonodeLogin(username, password, geonodeHomeUrl);
		}).then(function (parsedCookies) {
			if (parsedCookies instanceof Unauthorized) {
				response.status(401).end();
			} else {
				// Fetch user info from geonode.
				return geonodeFetchUserInfo(username)
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
		}).then(function () {
			return geonodeLogout(request.get('Cookie'), getGeonodeHomeUrl(config))
			.then(function (result) {
				// FIXME: The complicated data structure is here due to FrontOffice.
				response.status(200).json({success: true});
			}).catch(function (err) {
				next(err);
			});
		});
	}

	getLoginInfo(request, response, next) {
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
