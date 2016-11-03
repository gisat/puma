var superagent = require("superagent");
var Url = require("url").Url;

var config = require("../config");
var logger = require('../common/Logger').applicationWideLogger;
var sessionCache = require("../common/auth").sessionCache;


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
				throw new Error("Missing csrftoken cookie in response to /layers.")
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
						throw new Error(`Unknown status code {res.status} in login response.`);
					}
				}).catch(function (err) {
					// Status code 302 Found represents successful login in Geonode.
					// Other err status codes are unknown.
					if (err.response.status == 302) {
						let new_cookies = parseSetCookieHeaders(err.response.headers["set-cookie"]);
						Object.assign(cookies, new_cookies);
						if (!cookies.hasOwnProperty("csrftoken")) {
							throw new Error("Missing csrftoken cookie in login response.");
						} else if (!cookies.hasOwnProperty("sessionid")) {
							throw new Error("Missing sessionid cookie in login response.");
						} else {
							return cookies;
						}
					} else {
						logger.error(err);
						throw new Error(`Unknown status code {err.response.status} or other error in login response.`);
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
		.then(function (res) {
			if (res.status == 200) {
				return true;
			}
		}).catch(function (err) {
			logger.error(err);
			throw new Error("Error");
		});
}


class Unauthorized {}


class LoginController {
	constructor(app) {
		if (!app) {
		    throw new Error(logger.error("LoginController#constructor The controller must receive valid app."));
		}
		app.post("/api/login/login", this.login.bind(this));
		app.get("/api/login/logout", this.logout.bind(this));
		app.post("/api/login/getLoginInfo", this.getLoginInfo.bind(this));
	}

	login(request, response, next) {
		var username = request.body.username;
		var password = request.body.password;
		var geonodeHomeUrl = getGeonodeHomeUrl(config);
		geonodeLogin(username, password, geonodeHomeUrl)
			.then(function (cookies) {
				if (cookies instanceof Unauthorized) {
					response.status(401).end();
				} else {
					response.status(200);

					// Set session data.
					var ssid = cookies["sessionid"].value;
					sessionCache[ssid] = username;

					// Proxy geonode cookies to user agent.
					for (let name in cookies) {
						response.set("Set-Cookie", cookies[name].headerLine);
					}

					// Set panther own ssid cookie.
					response.cookie("ssid", ssid, {httpOnly: true});

					// Set JSON response data.
					response.json({status: "ok", ssid: ssid, csrfToken: cookies["csrftoken"].value});
				}
			}).catch(function (err) {
				next(err);
			});
	}

	logout(request, response, next) {
		geonodeLogout(request.get('Cookie'), getGeonodeHomeUrl(config))
			.then(function (result) {
				response.clearCookie("ssid");
				delete sessionCache[ssid];
			}).catch(function (err) {
				next(err);
			});
	}

	getLoginInfo(request, response, next) {
		if (request.userId) {
			response.json(null);
		} else {
			response.json({
				userId: request.userId,
				groups: request.groups,
				userName: request.userName
			})
		}
	}
}


module.exports = LoginController;

