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

function listBody(plan, group, type) {
    const typeSchema = plan[group][type];
    const columns = typeSchema.columns;

    return Joi.object().keys({
        filter: _.mapValues(columns, colFilterSchema),
        order: Joi.array()
            .items(
                Joi.array()
                    .length(2)
                    .items(
                        Joi.string()
                            .valid(...Object.keys(columns))
                            .required(),
                        Joi.string().required().valid('ascending', 'descending')
                    )
            )
            .default([]),
        limit: Joi.number().integer().default(100),
        offset: Joi.number().integer().default(0),
    });
}

function dataColCreateSchema(col) {
    return col.schema.default(col.defaultValue);
}

function createBody(plan, group, type) {
    const typeSchema = plan[group][type];
    const columns = _.pick(
        typeSchema.columns,
        typeSchema.context.create.columns
    );

    const keyCol = columns.key;
    const dataCols = _.omit(columns, ['key']);

    return Joi.object()
        .required()
        .keys({
            data: Joi.object()
                .required()
                .keys({
                    [type]: Joi.array()
                        .required()
                        .items(
                            Joi.object().keys({
                                key: keyCol.schema.default(keyCol.defaultValue),
                                data: Joi.object()
                                    .keys(
                                        _.mapValues(
                                            dataCols,
                                            dataColCreateSchema
                                        )
                                    )
                                    .required(),
                            })
                        )
                        .min(1),
                }),
        });
}

function dataColUpdateSchema(col) {
    return col.schema;
}

function updateBody(plan, group, type) {
    const typeSchema = plan[group][type];
    const columns = _.pick(
        typeSchema.columns,
        typeSchema.context.update.columns
    );

    const keyCol = columns.key;
    const dataCols = _.omit(columns, ['key']);

    return Joi.object()
        .required()
        .keys({
            data: Joi.object()
                .required()
                .keys({
                    [type]: Joi.array()
                        .required()
                        .items(
                            Joi.object().keys({
                                key: keyCol.schema.required(),
                                data: Joi.object()
                                    .keys(
                                        _.mapValues(
                                            dataCols,
                                            dataColUpdateSchema
                                        )
                                    )
                                    .required(),
                            })
                        )
                        .min(1),
                }),
        });
}

function deleteBody(plan, group, type) {
    const typeSchema = plan[group][type];
    const columns = typeSchema.columns;

    const keyCol = columns.key;

    return Joi.object()
        .required()
        .keys({
            data: Joi.object()
                .required()
                .keys({
                    [type]: Joi.array()
                        .required()
                        .items(
                            Joi.object().keys({
                                key: keyCol.schema.required(),
                            })
                        )
                        .min(1),
                }),
        });
}

module.exports = {
    listBody,
    createBody,
    updateBody,
    deleteBody,
};
