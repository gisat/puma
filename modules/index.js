const express = require('express');
const loginRouter = require('./login/router');
const restRouter = require('./rest/router');
const plan = require('./rest/plan');
const routing = require('./routing/index');
const swagger = require('./swagger/index');
const swaggerUi = require('swagger-ui-express');
const {errorMiddleware} = require('./error/index');

function apiRouter() {
    const router = express.Router();

    const api = restRouter.createAll(plan);
    const swaggerDocument = swagger.configFromApi(api);
    router.get('/swagger.json', function (req, res) {
        res.header('Content-Type', 'application/json')
            .status(200)
            .json(swaggerDocument);
    });
    router.use(routing.routerFromApi(api));
    router.use('', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    return router;
}

const router = express.Router();
router.use(loginRouter);
router.use(apiRouter());
router.use(errorMiddleware);

module.exports = {
    router,
};
