let Promise = require('promise');

let config = require('../config');
let logger = require('../common/Logger').applicationWideLogger;

let PgUsers = require('./PgUsers');

/**
 * This class handles users coming via the EO SSO. It takes their account information and either return the information
 * about them or it creates a new user.
 */
class SsoAuthentication {
    constructor(pgPool, schema) {
        this.pgUsers = new PgUsers(pgPool, schema);
    }

    /**
     * It prepares information for authentication based on the EO SSO header informations.
     * It also logs the user in the solution.
     * @param request
     * @param response
     * @returns {Promise}
     */
    authenticate(request, response) {
        logger.info('SsoAuthentication#authenticate Header: ', request.headers['umsso-person-email'], ' Remote: ', request.headers['remote_user'],
            ' Username: ', request.headers['umsso-person-commonname'], ' REMOTE_USER_APIKEY: ', request.headers['REMOTE_USER_APIKEY'],
            ' REMOTE_USER: ', request.headers['REMOTE_USER ']);

        if((request.headers['umsso-person-email'] && request.headers['umsso-person-email'] != '') || (request.headers['remote_user'] && request.headers['remote_user'] != '')) {
            let email = request.headers['umsso-person-email'] || request.headers['remote_user'];
            let username = request.headers['umsso-person-commonname'] || email;
            return this.pgUsers.byEmail(email).then(user => {
                if(!user) {
                    return this.pgUsers.add(email, username).then(user => {
                        request.session.userId = user.id;
                        request.session.userName = username;
                        request.session.username = username;
                    });
                } else {
                    request.session.userId = user.id;
                    request.session.userName = username;
                    request.session.username = username;
                }
            });
        } else {
            return Promise.resolve(null);
        }
    }
}

module.exports = SsoAuthentication;