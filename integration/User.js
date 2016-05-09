var User = function(username, password){
	this.username = username;
	this.password = password;
};

User.prototype.login = function(){
	var options1 = {
		protocol: config.geonodeProtocol,
		host: config.geonodeHost,
		path: config.geonodeHome+'/',
		method: 'GET',
		headers: {
			'referer': config.geonodeProtocol + '://' + config.geonodeHost + "/"
		}
	};

	conn.request(options1,null,function(err,output,res1) {
		if (err) return generalCallback(err);
		var qsVars = [];
		if(!('set-cookie' in res1.headers)) return generalCallback({message: 'cookies not set'});
		res1.headers['set-cookie'][0].split(';').forEach(function(element, index, array){
			var pair = element.split("=");
			var key = decodeURIComponent(pair.shift()).trim();
			var value = decodeURIComponent(pair.join("=")).trim();
			qsVars[key] = value;
		});
		var csrf = qsVars['csrftoken'];
		var postData = {
			username: params.username,
			password: params.password,
			csrfmiddlewaretoken: csrf,
			next: ''
		};
		if(isLogin){
			postData['username'] = params.username;
			postData['password'] = params.password;
		}
		postData = querystring.stringify(postData);
		var options2 = {
			protocol: config.geonodeProtocol,
			host: config.geonodeHost,
			path: isLogin ? config.geonodePath+'/account/login/' : config.geonodePath+'/account/logout/',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': postData.length,
				'Cookie':'csrftoken='+csrf,
				'referer': config.remoteProtocol + '://' + config.geonodeHost + '/'
			}
		};
		conn.request(options2,postData,function(err,output,res2) {
			if (err){
				console.log("\n\nconn.geonodeCom ERROR:\nerr code:", err, "\noutput:", output);
				return generalCallback(err);
			}
			return specificCallback(res2);
		});
	});
};

module.exports = User;