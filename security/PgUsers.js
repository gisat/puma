let Promise = require('promise');

let logger = require('../common/Logger').applicationWideLogger;

let PasswordHash = require('./PasswordHash');
let PgPermissions = require('./PgPermissions');
let PgGroups = require('./PgGroups');
let User = require('./User');
let Group = require('./Group');

class PgUsers {
    constructor(pool, schema) {
        this.pgPool = pool;
        this.schema = schema;

        this.groups = new PgGroups(pool, schema);
        this.permissions = new PgPermissions(pool, schema);
    }

    /**
     * Every existing user belongs on top of other groups to the groups guest and user.
     * Everyone accessing the platform belongs to the group guest.
     * @param id {Number} Id of the user.
     */
    byId(id) {
        let groups;
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
     * It adds new internal user to the database.
     * @param email {String} Email for the user to be used.
     * @param username {String} Name displayed in the BO.
     */
    add(email, username) {
        return this.pgPool.query(`INSERT INTO ${this.schema}.panther_users (email, username) VALUES ('${email}','${username}') RETURNING id`).then(result => {
            return result.rows[0].id;
        });
    }

    /**
     * It creates new user.
     * @param username {String} Username used for login and displayed in the BO
     * @param password {String} Password used for login.
     * @param name {String} Name displayed in the BackOffice
     * @param email {String} Email of the user used for email communication
     * @returns {Promise<Number>} Promise of id of the
     */
    create(username, password, name, email) {
        new PasswordHash(password).toString().then(hash => {
            return this.pgPool.query(`
			INSERT INTO ${this.schema}.panther_users (email, username, password, name) 
				VALUES ('${email}','${username}', '${hash}', '${name}') 
				RETURNING id`
            )
        }).then(result => {
            return result.rows[0].id;
        });
    }

    /**
     * It updates existing user.
     * @param id {Number} Id of the user.
     * @param username {String} Username used for login and displayed in the BO
     * @param password {String} Password used for login
     * @param name {String} Name displayed in the BackOffice
     * @param email {String} Email of the user for the email communication
     */
    update(id, username, password, name, email) {
        new PasswordHash(password).toString().then(hash => {
            return this.pgPool.query(`
			    UPDATE ${this.schema}.panther_users set username = '${username}', password = '${hash}', name='${name}', email='${email}' WHERE id = ${id}
		    `);
        });
    }
}

module.exports = PgUsers;
