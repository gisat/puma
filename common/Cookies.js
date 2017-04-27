class Cookies {
	constructor() {
	}

	fromHeader(headers) {
		var cookies = {};
		for (let headerLine of headers) {
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

	toHeader(cookies) {
		var pairs = Object.keys(cookies).map(key => {
			return key + "=" + cookies[key].value;
		});
		var headerLine = pairs.join("; ");
		return headerLine;
	}
}

module.exports = Cookies;