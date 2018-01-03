var UUID = function() {
	this.value = s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
};


UUID.prototype.toString = function(){
	return this.value;
};

UUID.prototype.toNumber = function() {
	var result = 0;
	for(var i = 0; i < this.value.length; ) {
		result += this.value.charCodeAt(i);
	}
	return result;
};

function s4() {
	return Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
}

module.exports = UUID;