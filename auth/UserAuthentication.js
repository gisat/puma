class UserAuthentication {
	constructor() {
	}

	authenticate(request, response, next) {
		next();
	}
}

module.exports = UserAuthentication;