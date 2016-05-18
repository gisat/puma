var UUID = function() {
	this.value = s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
};


UUID.prototype.toString = function(){
	return this.value;
};

UUID.prototype.withoutDelimiters = function() {
	return this.value.replace('-', '');
};

function s4() {
	return Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
}

module.exports = UUID;