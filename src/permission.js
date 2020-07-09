const qb = require('@imatic/pgqb');
const db = require('./db');

/**
 * @typedef {object} Permission
 * @property {string} resourceType
 * @property {string} permission
 * @property {Array<string|undefined>=} resourceKey - All resource keys we need access to
 *   (helpful if user doesn't have global access to the resource, but has access to individual resources)
 */

/**
 * @param {Permission} permission
 *
 * @returns {import('@imatic/pgqb').Expr}
 */
function permissionExpr(permission) {
    const keys = (permission.resourceKey || []).map((k) =>
        qb.expr.eq('p.resourceKey', qb.val.inlineParam(k))
    );

    return qb.expr.and(
        qb.expr.eq(
            'p.resourceType',
            qb.val.inlineParam(permission.resourceType)
        ),
        qb.expr.eq('p.permission', qb.val.inlineParam(permission.permission)),
        keys.length > 0
            ? qb.expr.or(qb.expr.null('p.resourceKey'), qb.expr.and(...keys))
            : qb.expr.null('p.resourceKey')
    );
}

/**
 * @param {Object} user
 * @param {Array<Permission>} permissions
 *
 * @returns {boolean}
 */
async function userHasAllPermissions(user, permissions) {
    if (user == null || permissions.length === 0) {
        return Promise.resolve(false);
    }

    const sqlMap = qb.merge(
        qb.select([qb.val.raw('1')]),
        qb.from('user.v_userPermissions', 'p'),
        qb.where(
            qb.expr.and(
                ...permissions.map(permissionExpr),
                qb.expr.eq('p.userKey', qb.val.inlineParam(user.key))
            )
        ),
        qb.limit(1)
    );

    const res = await db.query(qb.toSql(sqlMap));

    return res.rows.length > 0;
}

module.exports = {
    userHasAllPermissions,
};
