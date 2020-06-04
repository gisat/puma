const express = require('express');
const Joi = require('@hapi/joi');
const q = require('./query');
const parameters = require('../../middlewares/parameters');

function createOrderSchema(validColumns) {
    return Joi.array()
        .length(2)
        .items(
            Joi.string()
                .valid(...validColumns)
                .required(),
            Joi.string().required().valid('ascending', 'descending')
        );
}

const router = express.Router();

const FilteredUserBodySchema = Joi.object().keys({
    filter: Joi.object().default({}).keys({
        key: Joi.string(),
        email: Joi.string(),
        name: Joi.string(),
        phone: Joi.string(),
    }),
    order: Joi.array()
        .items(createOrderSchema(['key', 'email', 'name', 'phone']))
        .default([]),
    limit: Joi.number().integer().default(100),
    offset: Joi.number().integer().default(0),
});

router.post(
    '/rest/user/filtered/users',
    parameters({body: FilteredUserBodySchema}),
    async function (request, response) {
        const parameters = request.parameters.body;
        const userList = await q.userList({
            sort: parameters.order,
            filter: parameters.filter,
            page: {
                limit: parameters.limit,
                offset: parameters.offset,
            },
        });

        response.status(200).json(userList);
    }
);

// todo:
// router.post('/rest/user', function (request, response) {});
// router.put('/rest/user', function (request, response) {});
// router.delete('/rest/user', function (request, response) {});

module.exports = router;
