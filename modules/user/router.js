const express = require('express');
const Joi = require('@hapi/joi');
const q = require('./query');
const parameters = require('../../middlewares/parameters');
const _ = require('lodash');

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

function stringFilterSchema() {
    const ValueSchema = Joi.string();
    const validFilters = ['like', 'in', 'notin', 'eq'];

    return Joi.alternatives().try(
        ValueSchema,
        Joi.object().keys({
            like: ValueSchema,
            eq: ValueSchema,
            in: Joi.array().items(ValueSchema),
            notin: Joi.array().items(ValueSchema),
        })
    );
}

const StringFilterSchema = stringFilterSchema();

const FilteredUserBodySchema = Joi.object().keys({
    filter: Joi.object().default({}).keys({
        key: StringFilterSchema,
        email: StringFilterSchema,
        name: StringFilterSchema,
        phone: StringFilterSchema,
    }),
    order: Joi.array()
        .items(createOrderSchema(['key', 'email', 'name', 'phone']))
        .default([]),
    limit: Joi.number().integer().default(100),
    offset: Joi.number().integer().default(0),
});

function formatRow(row) {
    return {
        key: row.key,
        data: _.omit(row, ['key']),
    };
}

function formatList(group, {rows, count}, {limit, offset}) {
    return {
        data: {
            [group]: rows.map(formatRow),
        },
        success: true,
        limit: limit,
        offset: offset,
        total: count,
    };
}

router.post(
    '/rest/user/filtered/users',
    parameters({body: FilteredUserBodySchema}),
    async function (request, response) {
        const parameters = request.parameters.body;
        const page = {
            limit: parameters.limit,
            offset: parameters.offset,
        };
        const userList = await q.userList({
            sort: parameters.order,
            filter: parameters.filter,
            page: page,
        });

        response.status(200).json(formatList('users', userList, page));
    }
);

// todo:
// router.post('/rest/user', function (request, response) {});
// router.put('/rest/user', function (request, response) {});
// router.delete('/rest/user', function (request, response) {});

module.exports = router;
