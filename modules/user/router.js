const express = require('express');
const Joi = require('@hapi/joi');
const q = require('./query');
const parameters = require('../../middlewares/parameters');
const _ = require('lodash');
const uuid = require('../../uuid');

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

function stringFilterSchema(ValueSchema) {
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

const StringFilterSchema = stringFilterSchema(Joi.string());
const UuidFilterSchema = stringFilterSchema(Joi.string().uuid());

const FilteredUserBodySchema = Joi.object().keys({
    filter: Joi.object().default({}).keys({
        key: UuidFilterSchema,
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

function formatData(group, rows) {
    return {
        [group]: rows.map(formatRow),
    };
}

function formatList(group, {rows, count}, page) {
    const data = {
        data: formatData(group, rows),
        success: true,
        total: count,
    };

    if (page != null) {
        data.limit = page.limit;
        data.offset = page.offset;
    }

    return data;
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

const CreateUserSchema = Joi.object().keys({
    key: Joi.string()
        .uuid()
        .default(() => uuid.generate()),
    data: Joi.object()
        .keys({
            email: Joi.string().default(null),
            name: Joi.string().default(null),
            phone: Joi.string().default(null),
        })
        .required(),
});

const CreateUserBodySchema = Joi.object()
    .required()
    .keys({
        data: Joi.object()
            .required()
            .keys({
                users: Joi.array().required().items(CreateUserSchema).min(1),
            }),
    });

router.post(
    '/rest/user',
    parameters({body: CreateUserBodySchema}),
    async function (request, response) {
        const users = request.parameters.body.data.users;
        const createdKeys = await q.createUsers(users);

        const createdUsers = await q.userList({
            filter: {key: {in: createdKeys}},
        });

        response.status(201).json(formatList('users', createdUsers));
    }
);

const UpdateUserSchema = Joi.object().keys({
    key: Joi.string().uuid().required(),
    data: Joi.object()
        .keys({
            email: Joi.string(),
            name: Joi.string(),
            phone: Joi.string(),
        })
        .required(),
});

const UpdateUserBodySchema = Joi.object()
    .required()
    .keys({
        data: Joi.object()
            .required()
            .keys({
                users: Joi.array().required().items(UpdateUserSchema).min(1),
            }),
    });

router.put(
    '/rest/user',
    parameters({body: UpdateUserBodySchema}),
    async function (request, response) {
        const users = request.parameters.body.data.users;
        await q.updateUsers(users);

        const updatedUsers = await q.userList({
            filter: {key: {in: users.map((u) => u.key)}},
        });

        response.status(200).json(formatList('users', updatedUsers));
    }
);

const DeleteUserSchema = Joi.object().keys({
    key: Joi.string().uuid().required(),
});

const DeleteUserBodySchema = Joi.object()
    .required()
    .keys({
        data: Joi.object()
            .required()
            .keys({
                users: Joi.array().required().items(DeleteUserSchema).min(1),
            }),
    });

router.delete(
    '/rest/user',
    parameters({body: DeleteUserBodySchema}),
    async function (request, response) {
        const users = request.parameters.body.data.users;
        await q.deleteUsers(users);

        response.status(200).json({});
    }
);

module.exports = router;
