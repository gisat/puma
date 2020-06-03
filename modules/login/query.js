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

function userGroupsByKey(key) {
    if (key == null) {
        return [];
    }

    return db
        .query(
            SQL`
SELECT "g"."name"
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
        .then((res) => res.rows.map((r) => r.name));
}

module.exports = {
    getUser,
    getUserInfoByKey,
    userGroupsByKey,
};
