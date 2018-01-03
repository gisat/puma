let Group = require('./Group');
let PgPermissions = require('./PgPermissions');
let moment = require('moment');
let _ = require('underscore');
let logger = require('../common/Logger').applicationWideLogger;

/**
 * This class handles storage, retrieval and other associated operations for groups stored in the PostgreSQL database.
 */
class PgGroups {
    constructor(pgPool, schema) {
        this.pgPool = pgPool;
        this.schema = schema;

        this.permissions = new PgPermissions(pgPool, schema);
    }

	/**
     * It returns the group by id, if there is no such group it throws Error.
	 * @param id {Number} id of the group to retrieve.
     * @return {Promise|Group} Promise of retrieved group.
	 */
	byId(id) {
        let groups;
        return this.pgPool.pool().query(
            `SELECT * FROM ${this.schema}.groups WHERE id = ${id}`
        ).then((result => {
            if(result.rows.length == 0) {
                throw new Error(logger.error(`PgGroups#byId There is no group with given id: ${id}`));
            }

            groups = result.rows.map(group => new Group(group.id, null, group.name, group.created, group.created_by, group.changed, group.changed_by));
            return this.permissions.forGroup(groups[0].id);
        })).then((permissions => {
            groups[0].permissions = permissions;
            return groups[0];
        }))
    }

    byName(name) {
	    let groups;
        return this.pgPool.pool().query(
            `SELECT * FROM ${this.schema}.groups WHERE name = '${name}'`
        ).then((result => {
            if(result.rows.length == 0) {
                throw new Error(logger.error(`PgGroups#byId There is no group with given name: ${name}`));
            }

            groups = result.rows.map(group => new Group(group.id, null, group.name, group.created, group.created_by, group.changed, group.changed_by));
            return this.permissions.forGroup(groups[0].id);
        })).then((permissions => {
            groups[0].permissions = permissions;
            return groups[0];
        }))
    }

	/**
     * It returns Promise of all groups in the database represented as json. If there is no group in the database, empty array is returned.
     * @return {Promise|Group[]} Promise of all groups.
	 */
	json() {
        return this.pgPool.pool().query(this.jsonSql()).then(result => {
            let groups = {};
            result.rows.forEach(row => {
                if(!groups[row.id]) {
                    groups[row.id] = {};
					groups[row.id]._id = row.id;
					groups[row.id].name = row.name;
					groups[row.id].users = [];
					groups[row.id].permissionsTowards = [];
                }

                if(row.user_id && groups[row.id].users.indexOf(row.user_id) == -1) {
					groups[row.id].users.push(row.user_id);
				}

				if(row.resource_type && row.permission) {
                    groups[row.id].permissionsTowards.push({
                        resourceId: row.resource_id,
                        resourceType: row.resource_type,
                        permission: row.permission
                    });
                }
            });

            return _.keys(groups).map(groupId => {
                return groups[groupId];
            })
        });
    }

    jsonSql() {
        return `SELECT groups.id as id, groups.name, members.user_id, permissions.resource_id, permissions.resource_type, permissions.permission from ${this.schema}.groups
         left join ${this.schema}.group_has_members as members on groups.id = members.group_id
         left join ${this.schema}.group_permissions as permissions on groups.id = permissions.group_id`;
    }

	/**
     * It returns all groups that given user is member of. If he is member of no group, empty array is returned.
	 * @param userId {Number} Id of the user, whose group we want.
     * @return {Promise|Group[]} Promise of groups associated with given user.
	 */
	forUser(userId) {
        return this.pgPool.pool().query(
			`SELECT groups.id, groups.name FROM ${this.schema}.groups join ${this.schema}.group_has_members ON groups.id=group_has_members.group_id WHERE group_has_members.user_id = ${userId} GROUP BY groups.id, groups.name`
        ).then(result => {
            return result.rows.map(group => new Group(group.id, null, group.name));
        });
    }

	/**
     * It creates new group with given name and returns created instance with added id.
	 * @param name {String} Name of the group. It is possible to supply empty string.
	 * @param userId {Number} Id of the user who created the group.
	 */
	add(name, userId) {
		let time = moment().format('YYYY-MM-DD HH:mm:ss');
		return this.pgPool.pool().query(
		    `INSERT INTO ${this.schema}.groups (name, created, created_by, changed, changed_by) VALUES ('${name}', '${time}', ${userId}, '${time}', ${userId}) RETURNING id`
        ).then(result => {
            return this.byId(result.rows[0].id);
        });
    }

    //TODO: Delete associated members as well as permissions.
	/**
     * It deletes group with given id. If there s no group with given id, nothing happens.
	 * @param id {Number} Id of the group to delete
	 */
	delete(id) {
        return this.pgPool.pool().query(
            `DELETE FROM ${this.schema}.groups WHERE id = ${id}`
        );
    }

	/**
     * It updates name of the group with given id. If there is no group with given id, nothing happens.
	 * @param id {Number} Id of the group to be updated
	 * @param name {String} New name of the group.
	 */
	update(id, name) {
		return this.pgPool.pool().query(
		    `UPDATE ${this.schema}.groups SET name = '${name}' WHERE id = ${id}`
        );
	}

	/**
     * It adds member to the given group. If there is no such user or group, it is still added into the database. If at
     * some future time such combination exists it will bring nasty surprise. BEWARE.
     * TODO: Verify that the combination of user and group exists.
	 * @param userId {Number} Id of the user
	 * @param groupId {Number} Id of the group
	 * @param creatorId {Number} Id of the user responsible for this operation.
	 */
	addMember(userId, groupId, creatorId) {
		let time = moment().format('YYYY-MM-DD HH:mm:ss');
		return this.pgPool.pool().query(
		    `INSERT INTO ${this.schema}.group_has_members (group_id, user_id, created, created_by, changed, changed_by) 
            VALUES (${groupId},${userId}, '${time}', ${creatorId}, '${time}', ${creatorId})`
        );
    }

    isMember(userId, groupId) {
	    return this.pgPool.query(
	        `SELECT * FROM ${this.schema}.group_has_members WHERE user_id = ${userId} AND group_id = ${groupId}`
        ).then(result => {
            if(result.rows.length > 0) {
                return true;
            } else {
                return false;
            }
        });
    }

	/**
     * It removes member from given group. If there is no member with this id or group with this id, nothing happens.
	 * @param userId {Number} Id of the user to remove from group.
	 * @param groupId {Number} Id of the group to remove the user from.
	 */
	removeMember(userId, groupId) {
        return this.pgPool.pool().query(
            `DELETE FROM ${this.schema}.group_has_members WHERE user_id = ${userId} AND group_id = ${groupId}`
        );
    }
}

module.exports = PgGroups;