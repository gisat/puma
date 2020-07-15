const express = require('express');
const loginApi = require('./login/router');
const restRouter = require('./rest/router');
const plan = require('./rest/plan');
const routing = require('./routing/index');
const swagger = require('./swagger/index');
const swaggerUi = require('swagger-ui-express');
const {errorMiddleware} = require('./error/index');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

function apiRouter() {
    const router = express.Router();

    const api = [...loginApi, ...restRouter.createAll(plan)];
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
router.use(cookieParser());
router.use(bodyParser.json());
router.use(apiRouter());
router.use(errorMiddleware);

module.exports = {
    router,
};
