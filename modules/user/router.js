const express = require('express');
const parameters = require('../../middlewares/parameters');
const _ = require('lodash');
const plan = require('../rest/plan');
const schema = require('../rest/schema');
const q = require('../rest/query');

const router = express.Router();

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
    parameters({body: schema.listBody(plan, 'user', 'users')}),
    async function (request, response) {
        const parameters = request.parameters.body;
        const page = {
            limit: parameters.limit,
            offset: parameters.offset,
        };
        const userList = await q.list(plan, 'user', 'users', {
            sort: parameters.order,
            filter: parameters.filter,
            page: page,
        });

        response.status(200).json(formatList('users', userList, page));
    }
);

router.post(
    '/rest/user',
    parameters({body: schema.createBody(plan, 'user', 'users')}),
    async function (request, response) {
        const users = request.parameters.body.data.users;
        const createdKeys = await q.create(plan, 'user', 'users', users);

        const createdUsers = await q.list(plan, 'user', 'users', {
            filter: {key: {in: createdKeys}},
        });

        response.status(201).json(formatList('users', createdUsers));
    }
);

router.put(
    '/rest/user',
    parameters({body: schema.updateBody(plan, 'user', 'users')}),
    async function (request, response) {
        const users = request.parameters.body.data.users;
        await q.update(plan, 'user', 'users', users);

        const updatedUsers = await q.list(plan, 'user', 'users', {
            filter: {key: {in: users.map((u) => u.key)}},
        });

        response.status(200).json(formatList('users', updatedUsers));
    }
);

router.delete(
    '/rest/user',
    parameters({body: schema.deleteBody(plan, 'user', 'users')}),
    async function (request, response) {
        const users = request.parameters.body.data.users;
        await q.deleteRecords(plan, 'user', 'users', users);

        response.status(200).json({});
    }
);

module.exports = router;
