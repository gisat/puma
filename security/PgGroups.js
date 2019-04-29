let moment = require('moment');
let _ = require('lodash');
let logger = require('../common/Logger').applicationWideLogger;

let Group = require('./Group');
let Permission = require('./Permission');
let PgPermissions = require('./PgPermissions');

/**
 * This class handles storage, retrieval and other associated operations for groups stored in the PostgreSQL database.
 */
class PgGroups {
    constructor(pgPool, schema) {
        this.pgPool = pgPool;
        this.schema = schema;

        this._permissions = new PgPermissions(pgPool, schema);
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

            groups = result.rows.map(group => new Group(group.id, null, group.name, group.identifier, group.created, group.created_by, group.changed, group.changed_by));
            return this._permissions.forGroup(groups[0].id);
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
        let groups = {}, groupKeys;
        return this.pgPool.pool().query(this.jsonSql()).then(result => {
            result.rows.forEach(row => {
                if(!groups[row.id]) {
                    groups[row.id] = {};
					groups[row.id]._id = row.id;
					groups[row.id].name = row.name;
					groups[row.id].identifier = row.identifier;
					groups[row.id].users = [];
					groups[row.id].permissionsTowards = [];
                    groups[row.id].permissionsUsers = [];
                    groups[row.id].permissionsGroups = [];
                }

                if(row.user_id && groups[row.id].users.indexOf(row.user_id) == -1) {
					groups[row.id].users.push(row.user_id);
				}

				if(row.resource_type && row.permission && row.permission === Permission.CREATE) {
                    groups[row.id].permissionsTowards.push({
                        resourceId: row.resource_id,
                        resourceType: row.resource_type,
                        permission: row.permission
                    });
                }
            });

            groupKeys = _.keys(groups);

            return this.pgPool.query(`SELECT * FROM ${this.schema}.permissions WHERE resource_id IN ('${groupKeys.join('\',\'')}')`);
        }).then(result => {
            result.rows.forEach(row => {
                groups[row.resource_id].permissionsUsers.push({
                    userId: row.user_id,
                    resourceType: row.resource_type,
                    permission: row.permission
                });
            });

            return this.pgPool.query(`SELECT * FROM ${this.schema}.group_permissions WHERE resource_id IN ('${groupKeys.join('\',\'')}')`);
        }).then(result => {
            result.rows.forEach(row => {
                groups[row.resource_id].permissionsGroups.push({
                    groupId: row.group_id,
                    resourceType: row.resource_type,
                    permission: row.permission
                });
            });

            return groupKeys.map(groupId => {
                return groups[groupId];
            })
        });
    }

    jsonSql() {
        return `SELECT groups.id as id, groups.name, groups.identifier, members.user_id, permissions.resource_id, permissions.resource_type, permissions.permission from ${this.schema}.groups
         left join ${this.schema}.group_has_members as members on groups.id = members.group_id
         left join ${this.schema}.group_permissions as permissions on groups.id = permissions.group_id`;
    }

    jsonSimple() {
		return this.pgPool.query(this.jsonSimpleSql())
			.then((pgResults) => {
				return pgResults.rows;
			});
	}

	jsonSimpleSql() {
		return `SELECT "groups"."id" AS id, "groups"."name" AS name "groups"."identifier" AS identifier FROM "${this.schema}"."groups";`;
	}

	/**
     * It returns all groups that given user is member of. If he is member of no group, empty array is returned.
	 * @param userId {Number} Id of the user, whose group we want.
     * @return {Promise|Group[]} Promise of groups associated with given user.
	 */
	forUser(userId) {
        return this.pgPool.pool().query(
			`SELECT groups.id, groups.name, groups.identifier FROM ${this.schema}.groups join ${this.schema}.group_has_members ON groups.id=group_has_members.group_id WHERE group_has_members.user_id = ${userId} GROUP BY groups.id, groups.name`
        ).then(result => {
            return result.rows.map(group => new Group(group.id, null, group.name));
        });
    }

	/**
     * It creates new group with given name and returns created instance with added id.
	 * @param name {String} Name of the group. It is possible to supply empty string.
     * @param identifier {String} Identifier of the group.
	 * @param userId {Number} Id of the user who created the group.
	 */
	add(name, identifier, userId) {
		let time = moment().format('YYYY-MM-DD HH:mm:ss');
		return this.pgPool.pool().query(
		    `INSERT INTO ${this.schema}.groups (name, identifier, created, created_by, changed, changed_by) VALUES ('${name}', '${identifier}', '${time}', ${userId}, '${time}', ${userId}) RETURNING id`
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
     * @param group {Object}
        {
	 		name: "Example",
	 		identifier: "example",

			members: [1,23,4],
			permissions: ["location", "dataset"],

            // Permissions of the users towards this group
			users: {
				read: [1,22,3],
				update: [2,33,4],
				delete: [2,15,3]
			},

            // Permissions of the users towards this group
			groups: {
				read: [1,23,4],
				update: [1,23,4],
				delete: [1,23,4]
			}
	     }
     * @param current {Number} Id of the current user
     */
	update(id, group, current) {
        let updateName = '', updateIdentifier = '', members = '', permissions = '', permissionsUser = '', permissionsGroup = '';

        if(group.name) {
            updateName = `UPDATE ${this.schema}.groups SET name = '${group.name}' WHERE id = ${id};`;
        }

        if(group.identifier) {
            updateIdentifier = `UPDATE ${this.schema}.groups SET identifier = '${group.identifier}' WHERE id = ${id};`
        }

        if(group.members) {
            members = this.membersSql(id, group.members, current);
        }

        if(group.permissions) {
            permissions += `DELETE FROM ${this.schema}.group_permissions WHERE group_id = ${id} AND resource_id IS NULL;`;

            group.permissions.forEach(permission => {
                permissions += this._permissions.addGroupSql(id, permission, null, Permission.CREATE);
            })
        }

        if(group.users) {
            let users = group.users;
            permissionsUser += `DELETE FROM ${this.schema}.permissions WHERE resource_type = 'group' AND resource_id = '${id}';`;

            if(users.read) {
                users.read.forEach(read => {
                    permissionsUser += this._permissions.addSql(read, 'group', id, Permission.READ);
                })
            }

            if(users.update) {
                users.update.forEach(read => {
                    permissionsUser += this._permissions.addSql(read, 'group', id, Permission.UPDATE);
                })
            }

            if(users.delete) {
                users.delete.forEach(read => {
                    permissionsUser += this._permissions.addSql(read, 'group', id, Permission.DELETE);
                })
            }
        }

        if(group.groups) {
            let groups = group.groups;
            permissionsGroup += `DELETE FROM ${this.schema}.group_permissions WHERE resource_type = 'group' AND resource_id = '${id}';`;

            if(groups.read) {
                groups.read.forEach(read => {
                    permissionsGroup += this._permissions.addGroupSql(read, 'group', id, Permission.READ);
                })
            }

            if(groups.update) {
                groups.update.forEach(read => {
                    permissionsGroup += this._permissions.addGroupSql(read, 'group', id, Permission.UPDATE);
                })
            }

            if(groups.delete) {
                groups.delete.forEach(read => {
                    permissionsGroup += this._permissions.addGroupSql(read, 'group', id, Permission.DELETE);
                })
            }
        }

	    // I create all the necessary information here. In order to make sure that we call just one SQL query.
		return this.pgPool.pool().query(`
		    ${updateName};
		    
		    ${updateIdentifier};
            
            ${members};
            
            ${permissions};
            
            ${permissionsUser};
            
            ${permissionsGroup};
        `);
	}

    /**
     * It set the members as the current members of the group by removing previous state and setting the new state.
     * @param group {Number} Id of the group.
     * @param members {Number[]} Ids of the members of the group
     * @param creator {Number} Id of the curren user.
     */
	membersSql(group, members, creator) {
	    let membersSql = members.map(member => {
	        return this.addMemberSql(member, group, creator);
        }).join(';');
	    return `
	        DELETE FROM ${this.schema}.group_has_members WHERE group_id = ${group};
	        
	        ${membersSql}
	    `;
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
		return this.pgPool.pool().query(this.addMemberSql(userId, groupId, creatorId));
    }

    addMemberSql(userId, groupId, creatorId) {
        let time = moment().format('YYYY-MM-DD HH:mm:ss');
        return `INSERT INTO ${this.schema}.group_has_members (group_id, user_id, created, created_by, changed, changed_by) 
            VALUES (${groupId},${userId}, '${time}', ${creatorId}, '${time}', ${creatorId})`;
    }

    /**
     * It removes member from given group. If the user or group doesn't exist, nothing happens.
     * @param userId {Number} Id of the user
     * @param groupId {Number} Id of the group
     * @returns {Promise}
     */
    removeMember(userId, groupId) {
	    return this.pgPool.query(`DELETE FROM ${this.schema}.group_has_members WHERE group_id = ${groupId} AND user_id = ${userId}`);
    }

    /**
     * It returns list containing groups that exists based on the identifier.
     * @param communities {Object} Object containing identifier field.
     */
	async onlyExistingGroups(communities) {
        const result = await this.pgPool.query(`SELECT id, identifier FROM ${this.schema}.groups WHERE identifier IN (${communities.map(community => `'${community.identifier}'`).join(',')})`);

        return result.rows;
    }
}

module.exports = PgGroups;