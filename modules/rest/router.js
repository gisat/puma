const express = require('express');
const parameters = require('../../middlewares/parameters');
const _ = require('lodash');
const plan = require('./plan');
const schema = require('./schema');
const q = require('./query');

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

function create(plan, group, type) {
    return [
        {
            path: `/rest/${group}/filtered/${type}`,
            method: 'post',
            parameters: {
                body: schema.listBody(plan, group, type),
            },
            middlewares: [parameters],
            handler: async function (request, response) {
                const parameters = request.parameters.body;
                const page = {
                    limit: parameters.limit,
                    offset: parameters.offset,
                };
                const recordList = await q.list(plan, group, type, {
                    sort: parameters.order,
                    filter: parameters.filter,
                    page: page,
                });

                response.status(200).json(formatList(type, recordList, page));
            },
        },
        {
            path: `/rest/${group}`,
            method: 'post',
            parameters: {
                body: schema.createBody(plan, group, type),
            },
            middlewares: [parameters],
            handler: async function (request, response) {
                const records = request.parameters.body.data[type];
                const createdKeys = await q.create(plan, group, type, records);

                const createdRecords = await q.list(plan, group, type, {
                    filter: {key: {in: createdKeys}},
                });

                response.status(201).json(formatList(type, createdRecords));
            },
        },
        {
            path: `/rest/${group}`,
            method: 'put',
            parameters: {
                body: schema.updateBody(plan, group, type),
            },
            middlewares: [parameters],
            handler: async function (request, response) {
                const records = request.parameters.body.data.users;
                await q.update(plan, group, type, records);

                const updatedUsers = await q.list(plan, group, type, {
                    filter: {key: {in: records.map((u) => u.key)}},
                });

                response.status(200).json(formatList(type, updatedUsers));
            },
        },
        {
            path: `/rest/${group}`,
            method: 'delete',
            parameters: {body: schema.deleteBody(plan, group, type)},
            middlewares: [parameters],
            handler: async function (request, response) {
                const records = request.parameters.body.data[type];
                await q.deleteRecords(plan, group, type, records);

                response.status(200).json({});
            },
        },
    ];
}

function createAll(plan) {
    const handlers = [];

    _.forEach(plan, function (g, group) {
        _.forEach(g, function (t, type) {
            handlers.push(...create(plan, group, type));
        });
    });

    return handlers;
}

module.exports = {
    create,
    createAll,
};
