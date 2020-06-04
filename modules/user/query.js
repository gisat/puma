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
            filter.value.map((v) => qb.inlineParam(v))
        );
    },
    notin: function (filter) {
        return qb.expr.notin(
            filter.column,
            filter.value.map((v) => qb.inlineParam(v))
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

    return qb.expr.where(qb.expr.and(...exprs));
}

function sortToSqlExpr(requestSort, alias) {
    const exprs = requestSort.map(([field, order]) => {
        return qb.order(
            `${alias}.${field}`,
            order === 'ascending' ? 'ASC' : 'DESC'
        );
    });

    if (exprs.length === 0) {
        return {};
    }

    return qb.append(...exprs);
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
                        qb.limit(page.limit),
                        qb.offset(page.offset)
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

module.exports = {
    userList,
};
