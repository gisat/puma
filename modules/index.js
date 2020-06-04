const express = require('express');
const loginRouter = require('./login/router');
const userRouter = require('./user/router');

const router = express.Router();
router.use(loginRouter);
router.use(userRouter);

module.exports = {
    router,
};
