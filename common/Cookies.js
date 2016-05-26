var Cookies = function(response) {
	if(!response) {
		throw new Error("Cookies#constructor No response was supplied.");
	}

	this.response = response;
};

Cookies.prototype.atLeastOne = function() {
	return 'set-cookie' in this.response.headers;
};

Cookies.prototype.get = function(keyToLookUp) {
	var value = null;
	
	this.response.headers['set-cookie'][0].split(';').forEach(function(element, index, array){
		var pair = element.split("=");
		var key = decodeURIComponent(pair.shift()).trim();
		if(key == keyToLookUp) {
			value = decodeURIComponent(pair.join("=")).trim();
		}
	});

	return value;
};

module.exports = Cookies;