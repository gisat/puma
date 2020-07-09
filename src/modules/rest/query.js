const db = require('../../db');
const qb = require('@imatic/pgqb');
const _ = require('lodash');
const {SQL} = require('sql-template-strings');

const GUEST_KEY = 'cad8ea0d-f95e-43c1-b162-0704bfc1d3f6';

const filterOperatorToSqlExpr = {
    timefrom: function (filter) {
        return qb.expr.gte(filter.column, qb.val.inlineParam(filter.value));
    },
    timeto: function (filter) {
        return qb.expr.lte(filter.column, qb.val.inlineParam(filter.value));
    },
    like: function (filter) {
        return qb.expr.ilike(
            filter.column,
            qb.val.inlineParam(`%${filter.value}%`)
        );
    },
    in: function (filter) {
        return qb.expr.in(
            filter.column,
            filter.value.map((v) => qb.val.inlineParam(v))
        );
    },
    notin: function (filter) {
        return qb.expr.notin(
            filter.column,
            filter.value.map((v) => qb.val.inlineParam(v))
        );
    },
    eq: function (filter) {
        if (filter.value === null) {
            return qb.expr.null(filter.column);
        }

        return qb.expr.eq(filter.column, qb.val.inlineParam(filter.value));
    },
};

function getDb(client) {
    return client || db;
}

/**
 * Converts filters to the structure:
 * {
 *   column: <string>
 *   value: <any>
 *   operator: <string>
 * }
 */
function createFilters(requestFilter, alias) {
    const filters = [];
    _.forEach(requestFilter, (filterData, field) => {
        const column = `${alias}.${field}`;

        if (_.isObject(filterData)) {
            const type = Object.keys(filterData)[0];

            return filters.push({
                column: column,
                value: filterData[type],
                operator: type,
            });
        }

        filters.push({
            column: column,
            value: filterData,
            operator: 'eq',
        });
    });

    return filters;
}

function filtersToSqlExpr(filters) {
    const exprs = filters
        .map((filter) => {
            const createExpr = filterOperatorToSqlExpr[filter.operator];
            if (createExpr) {
                return createExpr(filter);
            }
        })
        .filter((f) => f != null);

    if (exprs.length === 0) {
        return {};
    }

    return qb.where(qb.expr.and(...exprs));
}

function sortToSqlExpr(requestSort, alias) {
    if (requestSort == null) {
        return {};
    }

    const exprs = requestSort.map(([field, order]) => {
        return qb.orderBy(
            `${alias}.${field}`,
            order === 'ascending' ? 'ASC' : 'DESC'
        );
    });

    if (exprs.length === 0) {
        return {};
    }

    return qb.append(...exprs);
}

function pageToQuery(page) {
    if (page == null) {
        return {};
    }

    return qb.merge(qb.limit(page.limit), qb.offset(page.offset));
}

function relationsQuery({plan, group, type}, alias) {
    const relations = plan[group][type].relations;

    const queries = _.map(relations, (rel, name) => {
        switch (rel.type) {
            case 'manyToMany': {
                const relAlias = 'rel_' + name;
                const column = name + 'Keys';
                const ownKey = `${relAlias}.${rel.ownKey}`;

                return qb.merge(
                    qb.select([
                        qb.val.raw(
                            `ARRAY_AGG(DISTINCT "${relAlias}"."${rel.inverseKey}" ORDER BY "${relAlias}"."${rel.inverseKey}") FILTER (WHERE "${relAlias}"."${rel.inverseKey}" IS NOT NULL) AS "${column}"`
                        ),
                    ]),
                    qb.joins(
                        qb.leftJoin(
                            rel.relationTable,
                            relAlias,
                            qb.expr.eq(ownKey, `${alias}.key`)
                        )
                    )
                );
            }
            case 'manyToOne': {
                const relAlias = 'rel_' + name;
                const column = name + 'Key';
                const ownKey = `${relAlias}.${rel.ownKey}`;

                return qb.merge(
                    qb.select([
                        qb.expr.as(
                            qb.val.raw(
                                `MIN("${relAlias}"."${rel.inverseKey}"::text)`
                            ),
                            column
                        ),
                    ]),
                    qb.joins(
                        qb.leftJoin(
                            rel.relationTable,
                            relAlias,
                            qb.expr.eq(ownKey, `${alias}.key`)
                        )
                    )
                );
            }
        }

        throw new Error(`Unspported relation type: ${rel.type}`);
    });

    if (queries.length === 0) {
        return {};
    }

    return qb.append(...queries);
}

function listPermissionQuery({user, type}, alias) {
    if (user == null) {
        return {};
    }

    return qb.merge(
        qb.joins(
            qb.join(
                'user.v_userPermissions',
                'tp',
                qb.expr.and(
                    qb.expr.eq('tp.resourceType', qb.val.inlineParam(type)),
                    qb.expr.eq('tp.permission', qb.val.inlineParam('view')),
                    qb.expr.or(
                        qb.expr.null('tp.resourceKey'),
                        qb.expr.eq(
                            'tp.resourceKey',
                            qb.val.raw(`"${alias}"."key"::text`)
                        )
                    )
                )
            )
        ),
        qb.where(qb.expr.eq('tp.userKey', qb.val.inlineParam(user.realKey)))
    );
}

function specificUserPermissionsQuery(userKey, type, alias, permissionsAlias) {
    const joinAlias = 'rela_' + permissionsAlias;

    return qb.merge(
        qb.select([
            qb.expr.as(
                qb.val.raw(`array_agg(DISTINCT "${joinAlias}"."permission")`),
                permissionsAlias
            ),
        ]),
        qb.joins(
            qb.leftJoin(
                'user.v_userPermissions',
                joinAlias,
                qb.expr.and(
                    qb.expr.eq(
                        `${joinAlias}.resourceType`,
                        qb.val.inlineParam(type)
                    ),
                    qb.expr.or(
                        qb.expr.null('tp.resourceKey'),
                        qb.expr.eq(
                            'tp.resourceKey',
                            qb.val.raw(`"${alias}"."key"::text`)
                        )
                    ),
                    qb.expr.eq(
                        `${joinAlias}.userKey`,
                        qb.val.inlineParam(userKey)
                    )
                )
            )
        )
    );
}

function listUserPermissionsQuery({user, type}, alias) {
    if (user == null) {
        return {};
    }

    return qb.append(
        specificUserPermissionsQuery(
            user.realKey,
            type,
            alias,
            'active_user_p'
        ),
        specificUserPermissionsQuery(GUEST_KEY, type, alias, 'guest_user_p')
    );
}

async function lastChange({group, type}) {
    const sqlMap = qb.merge(
        qb.select([qb.expr.as('a.action_tstamp_stm', 'change')]),
        qb.from('audit.logged_actions', 'a'),
        qb.where(
            qb.expr.and(
                qb.expr.eq('a.schema_name', qb.val.inlineParam(group)),
                qb.expr.eq('a.table_name', qb.val.inlineParam(type))
            )
        ),
        qb.orderBy('a.action_tstamp_stm', 'DESC'),
        qb.limit(1)
    );

    const res = await db.query(qb.toSql(sqlMap));

    return _.first(_.map(res.rows, (row) => row.change));
}

function list({plan, group, type, client, user}, {sort, filter, page}) {
    const typeSchema = plan[group][type];
    const columns = typeSchema.context.list.columns;
    const table = _.get(typeSchema, 'table', type);

    const sqlMap = qb.append(
        qb.merge(
            qb.select(columns.map((c) => 't.' + c)),
            qb.from(`${group}.${table}`, 't')
        ),
        listPermissionQuery({user, type}, 't'),
        listUserPermissionsQuery({user, type}, 't'),
        filtersToSqlExpr(createFilters(filter, 't')),
        relationsQuery({plan, group, type}, 't')
    );

    const countSqlMap = qb.merge(
        sqlMap,
        qb.select([
            qb.expr.as(
                qb.expr.fn('COUNT ', qb.val.raw('DISTINCT "t"."key"')),
                'count'
            ),
        ])
    );

    const db = getDb(client);

    return Promise.all([
        db
            .query(
                qb.toSql(
                    qb.append(
                        qb.merge(
                            sqlMap,
                            qb.groupBy(['t.key']),
                            sortToSqlExpr(sort, 't'),
                            pageToQuery(page)
                        )
                    )
                )
            )
            .then((res) => res.rows),
        db
            .query(qb.toSql(countSqlMap))
            .then((res) => _.get(res.rows[0], 'count', 0)),
    ]).then(([rows, count]) => ({
        rows,
        count: Number(count),
    }));
}

function recordValues(record, columns, columnsConfig) {
    const data = {...record.data, ...{key: record.key}};

    return columns.map((c) => columnsConfig[c].modifyExpr({value: data[c]}));
}

async function create({plan, group, type, client}, records) {
    const columnsConfig = plan[group][type].columns;
    const validColumns = new Set(Object.keys(columnsConfig));
    const columns = ['key', ...Object.keys(records[0].data)].filter((c) =>
        validColumns.has(c)
    );
    const table = _.get(plan[group][type], 'table', type);

    const sqlMap = qb.merge(
        qb.insertInto(`${group}.${table}`),
        qb.columns(columns),
        qb.values(records.map((r) => recordValues(r, columns, columnsConfig))),
        qb.returning(['key'])
    );

    const relationsByCol = _.mapKeys(plan[group][type].relations, function (
        rel,
        name
    ) {
        switch (rel.type) {
            case 'manyToMany':
                return name + 'Keys';
            case 'manyToOne':
                return name + 'Key';
        }

        throw new Error(`Unspported relation type: ${rel.type}`);
    });
    const validRelationCols = _.keys(relationsByCol);
    const relationQueryMaps = _.reduce(
        validRelationCols,
        function (acc, relCol) {
            const rel = relationsByCol[relCol];
            const values = _.filter(
                _.flatMap(records, function (record) {
                    const relKey = ensureArray(record.data[relCol]);
                    if (relKey == null) {
                        return;
                    }

                    switch (rel.type) {
                        case 'manyToMany':
                        case 'manyToOne':
                            if (relKey.length === 0) {
                                return;
                            }

                            return _.map(relKey, (rk) => [
                                qb.val.inlineParam(record.key),
                                qb.val.inlineParam(rk),
                            ]);
                    }

                    throw new Error(`Unspported relation type: ${rel.type}`);
                }),
                (v) => v != null
            );

            if (values.length === 0) {
                return acc;
            }

            acc.push(
                qb.merge(
                    qb.insertInto(rel.relationTable),
                    qb.columns([rel.ownKey, rel.inverseKey]),
                    qb.values(values)
                )
            );

            return acc;
        },
        []
    );

    return client.transactional(async (client) => {
        const res = await client
            .query(qb.toSql(sqlMap))
            .then((res) => res.rows.map((r) => r.key));

        await Promise.all(
            _.map(relationQueryMaps, (sqlMap) => client.query(qb.toSql(sqlMap)))
        );

        return res;
    });
}

function updateExprs(recordData, columnsConfig) {
    return Object.entries(recordData).map(([col, value]) => {
        return qb.expr.eq(col, columnsConfig[col].modifyExpr({value}));
    });
}

function updateRecord({plan, group, type, client}, record) {
    const columnsConfig = plan[group][type].columns;
    const validColumns = new Set(Object.keys(columnsConfig));
    const columns = _.keys(record.data).filter((c) => validColumns.has(c));
    const table = _.get(plan[group][type], 'table', type);

    const data = _.pick(record.data, columns);
    if (_.isEmpty(data)) {
        return Promise.resolve();
    }

    const sqlMap = qb.merge(
        qb.update(`${group}.${table}`, 'r'),
        qb.set(updateExprs(data, columnsConfig)),
        qb.where(qb.expr.eq('r.key', qb.val.inlineParam(record.key)))
    );

    return client.query(qb.toSql(sqlMap));
}

function quoteIdentifier(name) {
    return name
        .split('.')
        .map((v) => '"' + v + '"')
        .join('.');
}

function ensureArray(v) {
    if (v == null || _.isArray(v)) {
        return v;
    }

    return [v];
}

async function updateRecordRelation({plan, group, type, client}, record) {
    const relationsByCol = _.mapKeys(plan[group][type].relations, function (
        rel,
        name
    ) {
        switch (rel.type) {
            case 'manyToMany':
                return name + 'Keys';
            case 'manyToOne':
                return name + 'Key';
        }

        throw new Error(`Unspported relation type: ${rel.type}`);
    });
    const validRelationCols = _.keys(relationsByCol);
    const relationQueries = _.reduce(
        validRelationCols,
        function (acc, relCol) {
            if (!record.data.hasOwnProperty(relCol)) {
                return acc;
            }

            const rel = relationsByCol[relCol];
            const relKey = ensureArray(record.data[relCol]);

            switch (rel.type) {
                case 'manyToMany':
                case 'manyToOne':
                    if (relKey == null || relKey.length === 0) {
                        acc.push(
                            SQL`DELETE FROM `
                                .append(
                                    `${quoteIdentifier(
                                        rel.relationTable
                                    )} WHERE "${rel.ownKey}" = `
                                )
                                .append(SQL`${record.key}`)
                        );

                        return acc;
                    }

                    acc.push(
                        SQL`DELETE FROM `
                            .append(
                                `${quoteIdentifier(rel.relationTable)} WHERE "${
                                    rel.ownKey
                                }" = `
                            )
                            .append(SQL`${record.key} AND NOT (`)
                            .append(`"${rel.inverseKey}"`)
                            .append(SQL` = ANY(${relKey}))`)
                    );

                    const values = _.map(relKey, (rk) => {
                        return [
                            qb.val.inlineParam(record.key),
                            qb.val.inlineParam(rk),
                        ];
                    });

                    acc.push(
                        qb.toSql(
                            qb.merge(
                                qb.insertInto(rel.relationTable),
                                qb.columns([rel.ownKey, rel.inverseKey]),
                                qb.values(values),
                                qb.onConflict([rel.ownKey, rel.inverseKey]),
                                qb.doNothing()
                            )
                        )
                    );

                    return acc;
            }

            throw new Error(`Unspported relation type: ${rel.type}`);
        },
        []
    );

    await Promise.all(_.map(relationQueries, (sql) => client.query(sql)));
}

async function update({plan, group, type, client}, records) {
    return client.transactional(async (client) => {
        await Promise.all(
            records.map((r) => updateRecord({plan, group, type, client}, r))
        );

        await Promise.all(
            records.map((r) =>
                updateRecordRelation({plan, group, type, client}, r)
            )
        );
    });
}

async function deleteRecords({plan, group, type, client}, records) {
    const table = _.get(plan[group][type], 'table', type);
    const keys = records.map((r) => r.key);
    if (keys.length === 0) {
        return;
    }

    await client.query(
        `DELETE FROM "${group}"."${table}" WHERE key = ANY($1)`,
        [keys]
    );
}

module.exports = {
    list,
    create,
    update,
    deleteRecords,
    lastChange,
};
