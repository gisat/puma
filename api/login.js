var superagent = require("superagent");
var Url = require("url").Url;

var config = require("../config");
var conn = require("../common/conn");
var logger = require('../common/Logger').applicationWideLogger;
var sessionCache = require("../common/auth").sessionCache;

class Unauthorized {}

function _getGeonodeHomeUrl(config) {
	var homeUrl = new Url();
	homeUrl.protocol = config.geonodeProtocol;
	homeUrl.hostname = config.geonodeHost;
	homeUrl.port = config.geonodePort;
	homeUrl.pathname = config.geonodeHome;
	return homeUrl;
}

function _parseSetCookieHeaders(headerLines) {
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

function _formatCookieHeader(cookies) {
	var pairs = Object.keys(cookies).map(key => {
			return key + "=" + cookies[key].value;
	});
	var headerLine = pairs.join("; ");
	return headerLine;
}

function _geonodeLogin(username, password, geonodeHomeUrl) {
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
		cookies = _parseSetCookieHeaders(res.headers["set-cookie"]);
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
			.set('Cookie', _formatCookieHeader(cookies))
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
					let new_cookies = _parseSetCookieHeaders(err.response.headers["set-cookie"]);
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

function _geonodeLogout(cookieHeaderLine, geonodeHomeUrl) {
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

function login(params, req, res, next) {
	var username = req.body.username;
	var password = req.body.password;
	var geonodeHomeUrl = _getGeonodeHomeUrl(config);
	_geonodeLogin(username, password, geonodeHomeUrl)
	.then(function (cookies) {
		if (cookies instanceof Unauthorized) {
			res.status(401).end();
		} else {
			res.status(200);

			// Set session data.
			var ssid = cookies["sessionid"].value;
			sessionCache[ssid] = username;

			// Proxy geonode cookies to user agent.
			for (let name in cookies) {
				res.set("Set-Cookie", cookies[name].headerLine);
			}

			// Set panther own ssid cookie.
			res.cookie("ssid", ssid, {httpOnly: true});

			// Set JSON response data.
			res.json({status: "ok", ssid: ssid, csrfToken: cookies["csrftoken"].value});
		}
	}).catch(function (err) {
		next(err);
	});
}

function logout(params, req, res, next) {
	_geonodeLogout(req.get('Cookie'), _getGeonodeHomeUrl(config))
	.then(function (result) {
		res.clearCookie("ssid");
		delete sessionCache[ssid];
	}).catch(function (err) {
		next(err);
	});
}

function getLoginInfo(params, req, res, next) {
	if (req.userId) {
		res.json(null);
	} else {
		res.json({
			userId: req.userId,
			groups: req.groups,
			userName: req.userName
		})
	}
}

module.exports = {
	login: login,
	logout: logout,
	getLoginInfo: getLoginInfo
};
