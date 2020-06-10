const qb = require('@imatic/pgqb');
const config = require('../../config');
const db = require('../../db');
const _ = require('lodash');

const schema = config.pgSchema.user;

const filterOperatorToSqlExpr = {
    timefrom: function (filter) {
        return qb.expr.gte(filter.column, qb.val.inlineParam(filter.value));
    },
    timeto: function (filter) {
        return qb.expr.lte(filter.column, qb.val.inlineParam(filter.value));
    },
    like: function (filter) {
        // todo: ilike
        return qb.expr.like(
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
    Object.entries(requestFilter).forEach(([field, filterData]) => {
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

function userList({sort, filter, page}) {
    const sqlMap = qb.merge(
        qb.select(['u.key', 'u.email', 'u.name', 'u.phone']),
        qb.from(`${schema}.users`, 'u'),
        filtersToSqlExpr(createFilters(filter, 'u'))
    );

    const countSqlMap = qb.merge(
        sqlMap,
        qb.select([qb.expr.as(qb.expr.fn('COUNT', 'u.key'), 'count')])
    );

    return Promise.all([
        db
            .query(
                qb.toSql(
                    qb.merge(
                        sqlMap,
                        sortToSqlExpr(sort, 'u'),
                        pageToQuery(page)
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

const createColumns = ['email', 'name', 'phone', 'key'];

function userValues(user, columns) {
    const data = {...user.data, ...{key: user.key}};

    return columns.map((c) => qb.val.inlineParam(data[c]));
}

function createUsers(users) {
    const sqlMap = qb.merge(
        qb.insertInto(`${schema}.users`),
        qb.columns(createColumns),
        qb.values(users.map((u) => userValues(u, createColumns))),
        qb.returning(['key'])
    );

    return db.query(qb.toSql(sqlMap)).then((res) => res.rows.map((r) => r.key));
}

function updateExprs(userData) {
    return Object.entries(userData).map(([col, value]) => {
        return qb.expr.eq(col, qb.val.inlineParam(value));
    });
}

function updateUser(client, user) {
    const sqlMap = qb.merge(
        qb.update(`${schema}.users`, 'u'),
        qb.set(updateExprs(user.data)),
        qb.where(qb.expr.eq('u.key', qb.val.inlineParam(user.key)))
    );

    return client.query(qb.toSql(sqlMap));
}

async function updateUsers(users) {
    return db.transactional(async (client) => {
        await Promise.all(users.map((u) => updateUser(client, u)));
    });
}

async function deleteUsers(users) {
    const keys = users.map((u) => u.key);
    if (keys.length === 0) {
        return;
    }

    await db.query(`DELETE FROM "${schema}"."users" WHERE key = ANY($1)`, [
        keys,
    ]);
}

module.exports = {
    createUsers,
    userList,
    updateUsers,
    deleteUsers,
};
