const db = require('../../db');
const qb = require('@imatic/pgqb');
const _ = require('lodash');

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
            case 'manyToMany':
                const relAlias = 'rel_' + name;
                const column = name + 'Keys';
                const ownKey = `${relAlias}.${rel.ownKey}`;
                const inverseKey = `${relAlias}.${rel.inverseKey}`;

                return qb.merge(
                    qb.select([
                        qb.val.raw(
                            `ARRAY_AGG("${relAlias}"."${rel.inverseKey}") FILTER (WHERE "${relAlias}"."${rel.inverseKey}" IS NOT NULL) AS "${column}"`
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

        throw new Error(`Unspported relation type: ${rel.type}`);
    });

    if (queries.length === 0) {
        return {};
    }

    return qb.append(...queries);
}

function list({plan, group, type, client}, {sort, filter, page}) {
    const typeSchema = plan[group][type];
    const columns = typeSchema.context.list.columns;

    const sqlMap = qb.append(
        qb.merge(
            qb.select(columns.map((c) => 't.' + c)),
            qb.from(`${group}.${type}`, 't'),
            filtersToSqlExpr(createFilters(filter, 't'))
        ),
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

function recordValues(record, columns) {
    const data = {...record.data, ...{key: record.key}};

    return columns.map((c) => qb.val.inlineParam(data[c]));
}

function create({plan, group, type, client}, records) {
    const columns = ['key', ...Object.keys(records[0].data)];

    const sqlMap = qb.merge(
        qb.insertInto(`${group}.${type}`),
        qb.columns(columns),
        qb.values(records.map((r) => recordValues(r, columns))),
        qb.returning(['key'])
    );

    return getDb(client)
        .query(qb.toSql(sqlMap))
        .then((res) => res.rows.map((r) => r.key));
}

function updateExprs(recordData) {
    return Object.entries(recordData).map(([col, value]) => {
        return qb.expr.eq(col, qb.val.inlineParam(value));
    });
}

function updateRecord(group, type, client, record) {
    const sqlMap = qb.merge(
        qb.update(`${group}.${type}`, 'r'),
        qb.set(updateExprs(record.data)),
        qb.where(qb.expr.eq('r.key', qb.val.inlineParam(record.key)))
    );

    return client.query(qb.toSql(sqlMap));
}

async function update({plan, group, type, client}, records) {
    return getDb(client).transactional(async (client) => {
        await Promise.all(
            records.map((r) => updateRecord(group, type, client, r))
        );
    });
}

async function deleteRecords({group, type, client}, records) {
    const keys = records.map((r) => r.key);
    if (keys.length === 0) {
        return;
    }

    await getDb(
        client
    ).query(`DELETE FROM "${group}"."${type}" WHERE key = ANY($1)`, [keys]);
}

module.exports = {
    list,
    create,
    update,
    deleteRecords,
};
