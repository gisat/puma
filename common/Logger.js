var config = require('../config');

var Logger = function() {
	this.currentLevel = Logger.LEVEL_INFO;
};

Logger.LEVEL_TRACE = 0;
Logger.LEVEL_INFO = 1;
Logger.LEVEL_WARN = 2;
Logger.LEVEL_ERROR = 3;
Logger.LEVEL_NOTHING = 4;

Logger.prototype.setLevel = function(newLevel) {
	this.currentLevel = newLevel;
};

Logger.prototype.trace = function() {
	return this._log('trace', Logger.LEVEL_TRACE, arguments);
};

Logger.prototype.info = function() {
	return this._log('info', Logger.LEVEL_INFO, arguments);
};

Logger.prototype.warn = function() {
	return this._log('warn', Logger.LEVEL_WARN, arguments);
};

Logger.prototype.error = function() {
	return this._log('error', Logger.LEVEL_ERROR, arguments);
};

Logger.prototype._log = function(method, level, passedArguments) {
	var args = Array.prototype.slice.call(passedArguments);
	args.unshift(new Date().toISOString());
	args.unshift("[Panther] ");
	if(this.currentLevel <= level) {
		return console[method].apply(console, args);
	} else {
		return '';
	}
};

var applicationWideLogger = new Logger();
applicationWideLogger.setLevel(config.loggingLevel);

module.exports = {
	Logger: Logger,
	applicationWideLogger: applicationWideLogger
};