const config = require('../../config');
const db = require('../../db');
const {SQL} = require('sql-template-strings');

const schema = config.pgSchema.user;

function getUser(email, password) {
    return db
        .query(
            SQL`SELECT "key", "password" FROM`
                .append(` "${schema}"."users" `)
                .append(
                    SQL`WHERE "email" = ${email} AND "password" = crypt(${password}, "password")`
                )
        )
        .then((res) => {
            return res.rows[0];
        });
}

function getUserInfoByKey(key) {
    if (key == null) {
        return;
    }

    return db
        .query(
            SQL`SELECT "email", "name", "phone" FROM`
                .append(` "${schema}"."users" `)
                .append(SQL`WHERE "key" = ${key}`)
        )
        .then((res) => res.rows[0]);
}

function userGroupsForGuest() {
    return db
        .query(
            `
SELECT "g"."key", "g"."name"
FROM
  "${schema}"."groups" "g"
WHERE
  "g"."name" IN ('user', 'guest')
ORDER BY
  "g"."key"
`
        )
        .then((res) => res.rows);
}

function userGroupsByUser({key, type}) {
    if (key == null) {
        return [];
    }

    if (type === 'guest') {
        return userGroupsForGuest();
    }

    return db
        .query(
            SQL`
SELECT "g"."key", "g"."name"
FROM`.append(`
  "${schema}"."users" "u"
  JOIN "${schema}"."userGroups" "ug" ON "ug"."userKey" = "u"."key"
  JOIN "${schema}"."groups" "g" ON "g"."key" = "ug"."groupKey"`).append(SQL`
WHERE
  "u"."key" = ${key}
ORDER BY
  "g"."key"
`)
        )
        .then((res) => res.rows);
}

function groupPermissionsByKeys(groupKeys) {
    if (groupKeys.length === 0) {
        return [];
    }

    return db
        .query(
            `
SELECT
  "p"."resourceType", "p"."permission"
FROM
  "${schema}"."permissions" "p"
  JOIN "${schema}"."groupPermissions" "gp" ON "gp"."permissionKey" = "p"."key"
  JOIN "${schema}"."userGroups" "ug" ON "ug"."groupKey" = "gp"."groupKey"
WHERE
  "p"."resourceKey" IS NULL AND "ug"."groupKey" = ANY($1);
`,
            [groupKeys]
        )
        .then((res) => res.rows);
}

function userPermissionsByKey(key) {
    if (key == null) {
        return [];
    }

    return db
        .query(
            `
SELECT
  "p"."resourceType", "p"."permission"
FROM
  "${schema}"."permissions" "p"
  JOIN "${schema}"."userPermissions" "up" ON "up"."permissionKey" = "p"."key"
WHERE
  "p"."resourceKey" IS NULL AND "up"."userKey" = $1
UNION
SELECT
  "p"."resourceType", "p"."permission"
FROM
  "${schema}"."permissions" "p"
  JOIN "${schema}"."groupPermissions" "gp" ON "gp"."permissionKey" = "p"."key"
  JOIN "${schema}"."userGroups" "ug" ON "ug"."groupKey" = "gp"."groupKey"
WHERE
  "p"."resourceKey" IS NULL AND "ug"."userKey" = $1;
`,
            [key]
        )
        .then((res) => res.rows);
}

module.exports = {
    userPermissionsByKey,
    groupPermissionsByKeys,
    getUser,
    getUserInfoByKey,
    userGroupsByUser,
};
