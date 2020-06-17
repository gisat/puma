const qb = require('@imatic/pgqb');
const db = require('./db');

/**
 * @param {Object} user
 * @param {Array<{resourceType: string, permission: string}>} permissions
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
                qb.expr.and(
                    ...permissions.map((p) =>
                        qb.expr.and(
                            qb.expr.eq(
                                'p.resourceType',
                                qb.val.inlineParam(p.resourceType)
                            ),
                            qb.expr.eq(
                                'p.permission',
                                qb.val.inlineParam(p.permission)
                            )
                        )
                    )
                ),
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
