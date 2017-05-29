let superagent = require('superagent');

let Url = require("url").Url;

let config = require("../config");
let conn = require('../common/conn');
let logger = require('../common/Logger').applicationWideLogger;

let Cookies = require('../common/Cookies');
let Unauthorized = require('../security/Unauthorized');

class Geonode {
	constructor() {
		this.cookies = new Cookies();
	}

	homeUrl() {
		var homeUrl = new Url();
		homeUrl.protocol = config.geonodeProtocol;
		homeUrl.hostname = config.geonodeHost;
		homeUrl.port = config.geonodePort;
		homeUrl.pathname = config.geonodeHome;
		return homeUrl;
	}

	login(username, password) {
		logger.info(`Geonode#login Username: ${username} Passsword: ${password}`);
		let geonodeHomeUrl = this.homeUrl();
		var layersUrl = geonodeHomeUrl.resolveObject("/layers/");
		var loginUrl = geonodeHomeUrl.resolveObject("/account/login/");
		var refererUrl = geonodeHomeUrl.resolveObject("/");
		logger.info(`Geonode#login Layers: ${layersUrl} Login: ${loginUrl}`);
		var cookies = {};
		// During login request to geonode csrftoken must have been already established .
		// So we dig Geonode in order to obtain one.
		return superagent.get(layersUrl.format())
			.set("Referer", refererUrl.format())
			.redirects(0)
			.then((res) => {
				// Extract cookies together with csrftoken.
				cookies = this.cookies.fromHeader(res.headers["set-cookie"]);
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
					.set('Cookie', this.cookies.toHeader(cookies))
					.then((res) => {
						// Status code 200 OK represents failure in Geonode.
						// Other success status codes are unknown.
						if (res.status == 200) {
							return new Unauthorized();
						} else {
							throw new Error(logger.error(`Unhandled status code ${res.status} in geonode login response.`));
						}
					}).catch((err) => {
						// Status code 302 Found represents successful login in Geonode.
						// Other err status codes are unknown.
						if (err.response.status == 302) {
							let new_cookies = this.cookies.fromHeader(err.response.headers["set-cookie"]);
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

	logout(cookieHeaderLine) {
		let geonodeHomeUrl = this.homeUrl();
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

	fetchUserInfo(username) {
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
	}
}

module.exports = Geonode;