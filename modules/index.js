const express = require('express');
const loginRouter = require('./login/router');
const restRouter = require('./rest/router');
const plan = require('./rest/plan');

const router = express.Router();
router.use(loginRouter);
router.use(restRouter.createAll(plan));

module.exports = {
    router,
};
