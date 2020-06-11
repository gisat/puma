const Joi = require('@hapi/joi');
const _ = require('lodash');

function colFilterSchema(col) {
    const type = col.schema.type;
    const schema = col.schema;
    switch (type) {
        case 'string':
            return Joi.alternatives().try(
                schema,
                Joi.object().keys({
                    like: schema,
                    eq: schema,
                    in: Joi.array().items(schema),
                    notin: Joi.array().items(schema),
                })
            );
    }

    throw new Error(`Type "${type}" is not supported in filter.`);
}

function listPath(plan, group) {
    const types = Object.keys(plan[group]);

    return Joi.object()
        .required()
        .keys({types: Joi.string().valid(...types)});
}

function listBody(plan, group) {
    // todo: this merge won't work properly
    const columns = Object.assign({}, ..._.map(plan[group], (g) => g.columns));

    return Joi.object()
        .meta({className: `${group}List`})
        .keys({
            filter: _.mapValues(columns, colFilterSchema),
            order: Joi.array()
                .items(
                    Joi.array()
                        .length(2)
                        .items(
                            Joi.string()
                                .valid(...Object.keys(columns))
                                .required(),
                            Joi.string()
                                .required()
                                .valid('ascending', 'descending')
                        )
                )
                .default([]),
            limit: Joi.number().integer().default(100),
            offset: Joi.number().integer().default(0),
        });
}

function dataColCreateSchema(col) {
    if (col.hasOwnProperty('defaultValue')) {
        return col.schema.default(col.defaultValue);
    }

    return col.schema.required();
}

function createBody(plan, group) {
    const dataKeys = _.mapValues(plan[group], function (typeSchema) {
        const columns = _.pick(
            typeSchema.columns,
            typeSchema.context.create.columns
        );

        const keyCol = columns.key;
        const dataCols = _.omit(columns, ['key']);

        return Joi.array()
            .items(
                Joi.object().keys({
                    key: keyCol.schema.default(keyCol.defaultValue),
                    data: Joi.object()
                        .keys(_.mapValues(dataCols, dataColCreateSchema))
                        .required(),
                })
            )
            .min(1);
    });

    return Joi.object()
        .meta({className: `${group}Create`})
        .required()
        .keys({
            data: Joi.object().required().min(1).keys(dataKeys).min(1),
        });
}

function dataColUpdateSchema(col) {
    return col.schema;
}

function updateBody(plan, group) {
    const dataKeys = _.mapValues(plan[group], function (typeSchema) {
        const columns = _.pick(
            typeSchema.columns,
            typeSchema.context.update.columns
        );

        const keyCol = columns.key;
        const dataCols = _.omit(columns, ['key']);

        return Joi.array().items(
            Joi.object()
                .keys({
                    key: keyCol.schema.required(),
                    data: Joi.object()
                        .keys(_.mapValues(dataCols, dataColUpdateSchema))
                        .required(),
                })
                .min(1)
        );
    });

    return Joi.object()
        .meta({className: `${group}Update`})
        .required()
        .keys({
            data: Joi.object().required().min(1).keys(dataKeys),
        });
}

function deleteBody(plan, group) {
    const dataKeys = _.mapValues(plan[group], function (typeSchema) {
        const columns = typeSchema.columns;
        const keyCol = columns.key;

        return Joi.array()
            .min(1)
            .items(
                Joi.object().keys({
                    key: keyCol.schema.required(),
                })
            );
    });

    return Joi.object()
        .meta({className: `${group}Delete`})
        .required()
        .keys({
            data: Joi.object().required().min(1).keys(dataKeys),
        });
}

module.exports = {
    listPath,
    listBody,
    createBody,
    updateBody,
    deleteBody,
};
