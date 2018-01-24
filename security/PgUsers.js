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
        let usersByKeys = {}, userKeys = [];
        return this.pgPool.query(`SELECT usr.id, usr.email, usr.password, usr.name, permissions.resource_id, permissions.resource_type, 
            permissions.permission, gp.resource_id as gresource_id, gp.resource_type as gresource_type, gp.permission as gpermission,
            groups.id as group_id, groups.name as group_name
            FROM ${this.schema}.panther_users as usr
              LEFT JOIN ${this.schema}.permissions as permissions on usr.id = permissions.user_id
              LEFT JOIN ${this.schema}.group_has_members ghm ON usr.id = ghm.user_id
              LEFT JOIN ${this.schema}.groups groups ON ghm.group_id = groups.id
              LEFT JOIN ${this.schema}.group_permissions gp ON ghm.group_id = gp.id
              WHERE permissions.resource_type = 'dataset'
                    OR permissions.resource_type = 'location'
                    OR permissions.resource_type = 'topic'
                    OR permissions.resource_type = 'layer_wms'
                    OR permissions.resource_type is null;`).then(result => {
            let groupped = _.groupBy(result.rows, 'id');

            userKeys = Object.keys(groupped);
            userKeys.forEach(userId => {
                let permissions = [];

                groupped[userId].forEach(permission => {
                    permissions.push({
                        resourceId: permission.resource_id,
                        resourceType: permission.resource_type,
                        permission: permission.permission,
                        id: permission.id
                    });
                });

                let grouppedByGroup = _.groupBy(groupped[userId], 'group_id');

                let groups = Object.keys(grouppedByGroup).map(groupId => {
                    let permissions = [];

                    grouppedByGroup[groupId].forEach(permission => {
                        permissions.push({
                            resourceId: permission.gresource_id,
                            resourceType: permission.gresource_type,
                            permission: permission.gpermission,
                            id: permission.group_id
                        });
                    });

                    return new Group(grouppedByGroup[groupId][0].id, permissions, grouppedByGroup[groupId][0].name)
                });

                let user = new User(groupped[userId][0].id, permissions, groups);
                user.username = groupped[userId][0].name;
                user.email = groupped[userId][0].email;

                usersByKeys[user.id] = user;
            });

            return this.pgPool.query(`SELECT * FROM ${this.schema}.permissions WHERE permission = '${Permission.CREATE}' AND user_id IN ('${userKeys.join('\',\'')}');`);
        }).then(result => {
            result.rows.forEach(row => {
                usersByKeys[row.user_id].permissionsTowards.push({
                    resourceType: row.resource_type,
                    permission: row.permission
                });
            });

            return this.pgPool.query(`SELECT * FROM ${this.schema}.permissions WHERE resource_id IN ('${userKeys.join('\',\'')}')`);
        }).then(result => {
            result.rows.forEach(row => {
                usersByKeys[row.resource_id].permissionsUsers.push({
                    userId: row.user_id,
                    resourceType: row.resource_type,
                    permission: row.permission
                });
            });

            return this.pgPool.query(`SELECT * FROM ${this.schema}.group_permissions WHERE resource_id IN ('${userKeys.join('\',\'')}')`);
        }).then(result => {
            result.rows.forEach(row => {
                usersByKeys[row.resource_id].permissionsGroups.push({
                    groupId: row.group_id,
                    resourceType: row.resource_type,
                    permission: row.permission
                });
            });

            return userKeys.map(userId => {
                return usersByKeys[userId];
            })
        });
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
