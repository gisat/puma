let Promise = require('promise');
let bcrypt = require('bcrypt');

let logger = require('../common/Logger').applicationWideLogger;

let PasswordHash = require('./PasswordHash');
let PgPermissions = require('./PgPermissions');
let PgGroups = require('./PgGroups');
let User = require('./User');
let Group = require('./Group');

let _ = require('underscore');

class PgUsers {
    constructor(pool, schema) {
        this.pgPool = pool;
        this.schema = schema;

        this.groups = new PgGroups(pool, schema);
        this.permissions = new PgPermissions(pool, schema);
    }

    all() {
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

            return Object.keys(groupped).map(userId => {
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
                return user;
            });
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
     * It updates existing user.
     * @param id {Number} Id of the user.
     * @param password {String} Password used for login
     * @param name {String} Name displayed in the BackOffice
     * @param email {String} Email of the user for the email communication
     */
    update(id, password, name, email) {
        return new PasswordHash(password).toString().then(hash => {
            return this.pgPool.query(`
			    UPDATE ${this.schema}.panther_users set password = '${hash}', name='${name}', email='${email}' WHERE id = ${id}
		    `);
        });
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
            pUser.username = user.name;
            pUser.email = user.email;

            return pUser;
        });
    }
}

module.exports = PgUsers;
