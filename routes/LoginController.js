let config = require('../config');
let logger = require('../common/Logger').applicationWideLogger;

let PgUsers = require('../security/PgUsers');

/**
 * Controller for handling the login and logout of the user from the system. Internally this implementation uses Geonode
 * to log the user in.
 */
class LoginController {
    constructor(app, pgPool, commonSchema) {
        if (!app) {
            throw new Error(logger.error("LoginController#constructor The controller must receive valid app."));
        }
        app.get("/rest/logged", this.logged.bind(this));
        app.post("/api/login/login", this.login.bind(this));
        app.post("/api/login/logout", this.logout.bind(this));
        app.post("/api/login/getLoginInfo", this.getLoginInfo.bind(this));

        this.pgUsers = new PgUsers(pgPool, commonSchema || config.pgSchema.data);
    }

    logged(request, response) {
        // It is possible that nobody will be logged. In this case return 404
        if(request.session.user) {
            response.json(request.session.user.json());
        } else {
            response.status(404);
            response.json({status: 'Nobody is logged in.'});
        }
    }

    login(request, response, next) {
        let username = request.body.username;
        let password = request.body.password;
        logger.info(`LoginController#login Username: ${username}, Password: ${password}`);
        return new Promise((resolve) => {
            // Destroy current and create a new session.
            request.session.regenerate(resolve);
        }).then(() => {
            return this.pgUsers.verify(username, password);
        }).then((user) => {
            if(!user) {
                response.status(401).end();
            } else {
                Object.assign(request.session, {
                    user: user.json()
                });
                request.session.userId = user.id;
                response.status(200).json({
                    data: {
                        status: "ok"
                    },
                    success: true
                });
            }
        }).catch(function (err) {
            logger.error(`LoginController#login Error: `, err);

            next(err);
        });
    }

    logout(request, response, next) {
        return new Promise(function (resolve) {
            // Destroy current session.
            request.session.destroy(resolve);
        }).then(() => {
            // FIXME: The complicated data structure is here due to FrontOffice.
            response.status(200).json({success: true});
        }).catch(function (err) {
            next(err);
        });
    }

    getLoginInfo(request, response) {
        if (request.session.userId) {
            logger.info('LoginController#getLoginInfo Logged User: ', request.session.user);
            response.status(200).json({
                data: {
                    userId: request.session.userId,
                    userName: request.session.user.username,
                    groups: request.session.user.groups
                },
                success: true
            });
        } else {
            response.status(200).json({});
        }
    }
}


module.exports = LoginController;