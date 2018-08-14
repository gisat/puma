let Promise = require('promise');
let bcrypt = require('bcrypt');

let logger = require('../common/Logger').applicationWideLogger;

let Group = require('./Group');
let PasswordHash = require('./PasswordHash');
let PgPermissions = require('./PgPermissions');
let PgGroups = require('./PgGroups');
let Permission = require('./Permission');
let User = require('./User');

let _ = require('underscore');

class PgUsers {
    constructor(pool, schema) {
        this.pgPool = pool;
        this.schema = schema;

        this.groups = new PgGroups(pool, schema);
        this.permissions = new PgPermissions(pool, schema);
    }

	all() {
		return this.pgPool.query(
			`
			SELECT users.*,
				   (SELECT json_agg(_)
					FROM (SELECT resource_id AS resourceId, resource_type AS resourceType, permission
						  FROM "${this.schema}"."permissions"
						  WHERE user_id = users.id) AS _)     AS permissions,
				   (SELECT json_agg(_)
					FROM (SELECT g.id, g.name, (SELECT array_agg(_)
												FROM (SELECT resource_id AS resourceId, resource_type AS resourceType, permission
													  FROM "${this.schema}"."group_permissions" AS gp
													  WHERE gp.group_id = g.id) AS _) AS permissions
						  FROM "${this.schema}"."group_has_members" AS ghm
								 LEFT JOIN "${this.schema}"."groups" AS g ON g.id = ghm.group_id
						  WHERE ghm.user_id = users.id) AS _) AS groups,
				   (SELECT json_agg(_)
					FROM (SELECT DISTINCT p.resource_type AS "resourceType", p.permission
						  FROM "${this.schema}"."permissions" AS p
						  WHERE p.permission = 'POST'
							AND p.user_id = users.id) AS _) AS "permissionsTowards",
				   (SELECT json_agg(_)
					FROM (SELECT p.resource_type AS "resourceType", p.permission, p.user_id
						  FROM "${this.schema}"."permissions" AS p
						  WHERE p.resource_id = users.id::TEXT AND p.resource_type = 'user') AS _) AS "permissionsUsers",
				   (SELECT json_agg(_)
					FROM (SELECT gp.resource_type AS "resourceType", gp.permission, gp.group_id
						  FROM "${this.schema}"."group_permissions" AS gp
						  WHERE gp.resource_id = users.id::TEXT AND gp.resource_type = 'user') AS _) AS "permissionsGroups"
			FROM "${this.schema}"."panther_users" AS users;
            `
		).then((pgResult) => {
			return _.map(pgResult.rows, (row) => {
				let user = new User(
					row.id,
					row.permissions,
					_.map(row.groups, (group) => {
							return new Group(group.id, group.permissions, group.name)
						}
					)
				);

				user.email = row.email;
				user.username = row.name;
				user.permissionsTowards = row.permissionsTowards;
				user.permissionsUsers = row.permissionsUsers;
				user.permissionsGroups = row.permissionsGroups;

				return user;
			})
		})
	}

	jsonSimple() {
        return this.pgPool
            .query(this.jsonSimpleSql())
            .then((pgResults) => {
                return pgResults.rows
            });
    }

    jsonSimpleSql() {
        return `SELECT "users"."id" AS id, "users"."name" AS name FROM "${this.schema}"."panther_users" AS users;`
    }

    /**
     * Every existing user belongs on top of other groups to the groups guest and user.
     * Everyone accessing the platform belongs to the group guest.
     * @param id {Number} Id of the user.
     */
    byId(id) {
        logger.info(`PgUsers#byId Id: ${id}`);

        let groups, user;
        return new PgGroups(this.pgPool, this.schema).forUser(id).then(pGroups => {
            groups = pGroups;
            return Promise.all(groups.map(group => {
                return this.permissions.forGroup(group.id).then(permissions => {
                    group.permissions = permissions;
                });
            }));
        }).then(() => {
            return this.permissions.forGroup(Group.guestId())
        }).then((guestPermissions) => {
            groups.push(new Group(Group.guestId(), guestPermissions, "guest"));
            return this.permissions.forGroup(Group.userId())
        }).then((guestPermissions) => {
            groups.push(new Group(Group.userId(), guestPermissions, "user"));
            return this.permissions.forUser(id);
        }).then(permissions => {
            return new User(id, permissions, groups);
        }).then(pUser => {
            user = pUser;
            return this.pgPool.query(`SELECT * FROM ${this.schema}.panther_users where id = ${id}`);
        }).then(result => {
            user.username = result.rows[0].name;
            user.email = result.rows[0].email;
            return user;
        });
    }

    /**
     * It queries internal users based on their email. If there is none such user, it returns null
     * @param email {String} String representation of email of the user used for querying the internal users.
     * @returns {Promise} Promise returning either user with permissions or null.
     */
    byEmail(email) {
        return this.pgPool.query(`SELECT * FROM ${this.schema}.panther_users WHERE email = '${email}'`).then(results => {
            if (results.rows.length === 0) {
                logger.warn(`PgUsers#byEmail No user with email: ${email}`);
                return null;
            }

            return this.byId(Number(results.rows[0].id));
        });
    }

    /**
     * It queries internal users based on their email. If there is none such user, it returns false, otherwise true.
     * @param email {String} String representation of email of the user used for querying the users.
     * @returns {Promise|Boolean} Promise returning either true or false
     */
    exists(email) {
        return this.pgPool.query(`SELECT * FROM ${this.schema}.panther_users WHERE email = '${email}'`).then(results => {
            return results.rows.length > 0;
        });
    }

    /**
     * It adds new internal user to the database.
     * @param email {String} Email for the user to be used.
     * @param name {String} Name displayed in the BO.
     */
    add(email, name) {
        return this.pgPool.query(`INSERT INTO ${this.schema}.panther_users (email, name) VALUES ('${email}','${name}') RETURNING id`).then(result => {
            return result.rows[0].id;
        });
    }

    /**
     * It creates new user.* @param username {String} Username used for login and displayed in the BO
     * @param password {String} Password used for login.
     * @param name {String} Name displayed in the BackOffice
     * @param email {String} Email of the user used for email communication
     * @returns {Promise<Number>} Promise of id of the
     */
    create(password, name, email) {
        return new PasswordHash(password).toString().then(hash => {
            return this.pgPool.query(`
			INSERT INTO ${this.schema}.panther_users (email, password, name) 
				VALUES ('${email}', '${hash}', '${name}') 
				RETURNING id`
            )
        }).then(result => {
            return result.rows[0].id;
        });
    }

    /**
     * It updates existing user and inserts relevant permissions.
     * {
	 		name: "Jakub Balhar",
	 		password: "someRandomLongPassword",
	 		username: "jakub@balhar.net"

			permissions: ["location", "dataset"],

            // Permissions of the users towards this user
			users: {
				read: [1,22,3],
				update: [2,33,4],
				delete: [2,15,3]
			},

            // Permissions of the groups towards this user
			groups: {
				read: [1,23,4],
				update: [1,23,4],
				delete: [1,23,4]
			}
	 * }
     */
    update(id, user) {
        let permissions = ``, permissionsUser = ``, permissionsGroup = ``, updateUser = ``, passwordHashPromise;
        if(user.password) {
            passwordHashPromise = new PasswordHash(user.password).toString();
        } else {
            passwordHashPromise = Promise.resolve(null);
        }

        if(user.name) {
            updateUser += `UPDATE ${this.schema}.panther_users set name = '${user.name}' WHERE id = ${id};`;
        }

        if(user.username) {
            updateUser += `UPDATE ${this.schema}.panther_users set email = '${user.username}' WHERE id = ${id};`;
        }

        if(user.permissions) {
            permissions += `DELETE FROM ${this.schema}.permissions WHERE user_id = ${id} AND resource_id IS NULL;`;

            user.permissions.forEach(permission => {
                permissions += this.permissions.addSql(id, permission, null, Permission.CREATE);
            })
        }

        if(user.users) {
            let users = user.users;
            permissionsUser += `DELETE FROM ${this.schema}.permissions WHERE resource_type = 'user' AND resource_id = '${id}';`;

            if(users.read) {
                users.read.forEach(read => {
                    permissionsUser += this.permissions.addSql(read, 'user', id, Permission.READ);
                })
            }

            if(users.update) {
                users.update.forEach(read => {
                    permissionsUser += this.permissions.addSql(read, 'user', id, Permission.UPDATE);
                })
            }

            if(users.delete) {
                users.delete.forEach(read => {
                    permissionsUser += this.permissions.addSql(read, 'user', id, Permission.DELETE);
                })
            }
        }

        if(user.groups) {
            let groups = user.groups;
            permissionsUser += `DELETE FROM ${this.schema}.group_permissions WHERE resource_type = 'user' AND resource_id = '${id}';`;

            if(groups.read) {
                groups.read.forEach(read => {
                    permissionsUser += this.permissions.addGroupSql(read, 'user', id, Permission.READ);
                })
            }

            if(groups.update) {
                groups.update.forEach(read => {
                    permissionsUser += this.permissions.addGroupSql(read, 'user', id, Permission.UPDATE);
                })
            }

            if(groups.delete) {
                groups.delete.forEach(read => {
                    permissionsUser += this.permissions.addGroupSql(read, 'user', id, Permission.DELETE);
                })
            }
        }

        //
        return passwordHashPromise.then(hash => {
            if(hash) {
                updateUser += `UPDATE ${this.schema}.panther_users set password = '${hash}' WHERE id = ${id};`;
            }

            return this.pgPool.query(`
			    ${updateUser};
            
                ${permissions};
                
                ${permissionsUser};
                
                ${permissionsGroup};
		    `);
        });
    }

    delete(currentUserId, deleteId) {
        return this.pgPool.query(`
            DELETE FROM ${this.schema}.group_has_members WHERE user_id = ${deleteId};
            
            DELETE FROM ${this.schema}.panther_users WHERE id = ${deleteId};
            
            INSERT INTO ${this.schema}.audit (action, userId) VALUES ('Delete User ${deleteId}',${currentUserId});
        `);
    }

    /**
     * It verifies whether the user with given email and password exists.
     * @param email {String} Email of the user for the email communication
     * @param password {String} Password used for login
     */
    verify(email, password) {
        logger.info(`PgUsers#verify Email: ${email}, Password: ${password}`);

        let user;
        return this.pgPool.query(`SELECT * FROM ${this.schema}.panther_users WHERE email = '${email}'`).then(results => {
            if (results.rows.length === 0) {
                logger.warn(`PgUsers#verify No user with email: ${email}`);
                return null;
            }

            user = results.rows[0];
            logger.info(`PgUsers#verify User: `, user);

            return bcrypt.compare(password, user.password);
        }).then(result => {
            if (!result) {
                logger.warn(`PgUsers#verify Incorrect password for user with email: ${email}`);
                return null;
            }

            return this.byId(Number(user.id));
        }).then(pUser => {
            if(!pUser) {
                return null;
            }

            pUser.username = user.name;
            pUser.email = user.email;

            return pUser;
        });
    }
}

module.exports = PgUsers;
