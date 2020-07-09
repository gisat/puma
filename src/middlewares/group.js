const _ = require('lodash');

function userHasAnyGroup(user, groups) {
    if (user == null) {
        return false;
    }

    return _.intersection(user.groups, groups).length !== 0;
}

/**
 * Responds with `403` if user does not have any of given groups.
 */
function anyOf(groups) {
    return function (request, response, next) {
        if (userHasAnyGroup(request.user, groups)) {
            return next();
        }

        response.status(403).end();
    };
}

module.exports = {
    anyOf,
};
