const _ = require('lodash/fp');
const qb = require('@imatic/pgqb');

function compileColumn(column) {
    if (column.modifyExpr === undefined) {
        return _.set(
            'modifyExpr',
            ({value}) => qb.val.inlineParam(value),
            column
        );
    }

    return column;
}

function compileColumns(columns) {
    return _.mapValues(compileColumn, columns);
}

function compileType(type) {
    return _.update('columns', compileColumns, type);
}

function compileGroup(group) {
    return _.mapValues(compileType, group);
}

function compile(plan) {
    return _.mapValues(compileGroup, plan);
}

module.exports = {
    compile,
};
