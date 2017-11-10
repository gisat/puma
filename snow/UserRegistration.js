let config = require(`../config`);

let PgUsers = require(`../security/PgUsers`);

class UserRegistration {
    constructor(pgPool) {
        this._pgPool = pgPool;
        this._pgUsers = new PgUsers(this._pgPool, config.postgreSqlSchema);
    }

    register(request) {
        return Promise.resolve().then(() => {
            let username = request.username;
            let password = request.password;
            let email = request.email;

            if(!username || !password || !email) {
                return Promise.reject(new Error(`No username, password or email!`));
            } else if(
                !(!!username.match(/^[a-zA-Z0-9_]{6,}$/)
                    || !!username.match(/^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i)
                )
                || !password.match(/[a-zA-Z0-9_]{6,}/)
                || !email.match(/^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i)
            ) {
                return Promise.reject(new Error(`Username, password or email has invalid format!`));
            } else {
                return this._pgUsers.exists(email)
                    .then((exists) => {
                        if(!exists) {
                            return this._pgUsers.create(password, username, email)
                                .then((id) => {
                                    return {
                                        data: {
                                            userid: id,
                                        },
                                        success: true
                                    }
                                });
                        } else {
                            throw new Error(`Given email is already used!`);
                        }
                    });
            }
        });
    }
}

module.exports = UserRegistration;