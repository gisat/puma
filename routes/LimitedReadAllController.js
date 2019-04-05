var logger = require('../common/Logger').applicationWideLogger;
var crud = require('../rest/crud');
let Permission = require('../security/Permission');

const Controller = require('./Controller');

class LimitedReadAllController extends Controller {


    /**
     * Default implementation of reading all rest objects in this collection. This implementation doesn't verifies anything. If the collection is empty, empty array is returned.
     * @param request {Request} Request created by the Express framework.
     * @param request.session.userId {Number} Id of the user who issued the request.
     * @param response {Response} Response created by the Express framework.
     * @param next {Function} Function to be called when we want to send it to the next route.
     */
    readAll(request, response, next) {
        logger.info('Controller#readAll Read all instances of type: ', this.type, ' By User: ', request.session.userId);

        var self = this;
        this.getFilterByScope(request.params.scope).then(filter => {
            crud.read(this.type, filter, {
                userId: request.session.userId,
                justMine: request.query['justMine']
            }, (err, result) => {
                if (err) {
                    logger.error("It wasn't possible to read collection:", self.type, " by User: ", request.session.userId, " Error: ", err);
                    return next(err);
                }

                let resultsWithRights = [];
                Promise.all(result.map(element => {
                    return Promise.all([this.right(request.session.user, Permission.UPDATE, element._id, element),
                        this.right(request.session.user, Permission.DELETE, element._id, element)]).then(result => {
                        if (result[0] === true || result[1] === true) {
                            resultsWithRights.push(element);
                        }
                    })

                })).then(() => {
                    return this.permissions.forTypeCollection(this.type, resultsWithRights).then(() => {
                        response.json({data: resultsWithRights});
                    })
                }).catch(err => {
                    logger.error(`Controller#readAll Instances of type ${self.type} Error: `, err);
                    response.status(500).json({status: 'err'});
                });
            });
        });
    }
}

module.exports = LimitedReadAllController;