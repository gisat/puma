let Promise = require('promise');

/**
 * It represents permissions stored in the PostgreSQL database.
 * @alias PgPermissions
 * @constructor
 */
class PgPermissions {
	constructor(pgPool, schema) {
		this.pgPool = pgPool;
		this.schema = schema;
	}

	/**
	 * This retrieves all permissions for user with given id. Promise is returned, if there is no permission empty array
	 * is returned
	 * @param userId {Number} Id of the user
	 * @return {Promise} Promise of permissions for user.
	 */
	forUser(userId) {
		return this.pgPool.pool().query(this.forUserSql(userId))
			.then(this.transformFromRowsToPermissions);
	}

	// Private
	transformFromRowsToPermissions(result) {
		return result.rows.map(row => {
			return {
				resourceType: row.resource_type,
				resourceId: row.resource_id,
				permission: row.permission,
				id: row.user_id || row.group_id || null
			}
		})
	}

	// Private
	forUserSql(userId) {
		return `SELECT * FROM ${this.schema}.permissions WHERE user_id = ${userId} AND resource_type <> 'layerref'`;
	}

	forGroup(groupId) {
		return this.pgPool.pool().query(this.forGroupSql(groupId))
			.then(this.transformFromRowsToPermissions);
	}

	forGroupSql(groupId) {
		return `SELECT * from ${this.schema}.group_permissions WHERE group_id = ${groupId}`;
	}

    /**
	 * It adds permission to the user for given resource type and id.
	 * @param userId {Number} Id of the user
	 * @param resourceType {String} Type of the resource toward which the rights are valid.
	 * @param resourceId {Number} Id of the resource
	 * @param permission {String} One of these GET, POST, PUT, DELETE, ADMINISTER
	 */
	add(userId, resourceType, resourceId, permission) {
		let sql = this.addSql(userId, resourceType, resourceId, permission);
		return this.pgPool.pool().query(sql);
	}

    addCollection(groupId, resourceType, resourceIds, permission) {
        let sql = resourceIds.map(resourceId => {
            return this.addSql(groupId, resourceType, resourceId, permission);
        }).join(' ');
        return this.pgPool.query(sql);
    }

    /**
	 * @param userId
     * @param resourceType
     * @param resourceId
     * @param permission
     * @returns {string}
     */
	addSql(userId, resourceType, resourceId, permission) {
		if(resourceId) {
			return `INSERT INTO ${this.schema}.permissions (user_id, resource_type, resource_id, permission) 
						SELECT ${userId}, '${resourceType}', '${resourceId}', '${permission}' WHERE NOT EXISTS (
							SELECT 1 FROM ${this.schema}.permissions WHERE 
								user_id = ${userId} AND resource_type = '${resourceType}' AND resource_id = '${resourceId}' AND permission = '${permission}'  
						);`;
		} else {
			return `INSERT INTO ${this.schema}.permissions (user_id, resource_type, permission) 
						SELECT ${userId}, '${resourceType}', '${permission}' WHERE NOT EXISTS (
							SELECT 1 FROM ${this.schema}.permissions WHERE 
								user_id = ${userId} AND resource_type = '${resourceType}' AND resource_id IS NULL AND permission = '${permission}'  
						);`;
		}
	}

	addGroup(groupId, resourceType, resourceId, permission) {
		return this.pgPool.query(this.addGroupSql(groupId, resourceType, resourceId, permission));
	}

    addGroupCollection(groupId, resourceType, resourceIds, permission) {
        let sql = resourceIds.map(resourceId => {
            return this.addGroupSql(groupId, resourceType, resourceId, permission);
        }).join(' ');
        return this.pgPool.query(sql);
    }

    /**
	 * @param groupId
     * @param resourceType
     * @param resourceId
     * @param permission
     * @returns {string}
     */
	addGroupSql(groupId, resourceType, resourceId, permission) {
		if(resourceId) {
			return `INSERT INTO ${this.schema}.group_permissions (group_id, resource_type, resource_id, permission) 
						SELECT ${groupId}, '${resourceType}', '${resourceId}', '${permission}' WHERE NOT EXISTS (
							SELECT 1 FROM ${this.schema}.group_permissions WHERE 
								group_id = ${groupId} AND resource_type = '${resourceType}' AND resource_id = '${resourceId}' AND permission = '${permission}'  
						);`;
		} else {
			return `INSERT INTO ${this.schema}.group_permissions (group_id, resource_type, permission) 
						SELECT ${groupId}, '${resourceType}', '${permission}' WHERE NOT EXISTS (
							SELECT 1 FROM ${this.schema}.group_permissions WHERE 
								group_id = ${groupId} AND resource_type = '${resourceType}' AND resource_id IS NULL AND permission = '${permission}'  
						);`;
		}
	}

	/**
	 * It removes permission from the user for given resource type and id.
	 * @param userId {Number} Id of the user
	 * @param resourceType {String} Type of the resource toward which the rights are valid.
	 * @param resourceId {Number} Id of the resource
	 * @param permission {String} One of these GET, POST, PUT, DELETE, ADMINISTER
	 */
	remove(userId, resourceType, resourceId, permission) {
		return this.pgPool.pool().query(this.removeSql(userId, resourceType, resourceId, permission));
	}

	removeAllForResource(resourceType, resourceId) {
		return this.pgPool.query(this.removeAllForResourceSql(resourceType, resourceId));
	}

	// Private
	removeSql(userId, resourceType, resourceId, permission) {
		let andResourceId = '';
		if (resourceId) {
			andResourceId = ` AND resource_id = '${resourceId}' `;
		}
		return `DELETE FROM ${this.schema}.permissions WHERE user_id = ${userId} AND resource_type = '${resourceType}' ${andResourceId} AND permission = '${permission}'`;
	}

	removeAllForResourceSql(resourceType, resourceId) {
		return `DELETE FROM "${this.schema}"."permissions" AS p WHERE "p"."resource_type" = '${resourceType}' AND "p"."resource_id" = '${resourceId}';`;
	}

	forType(type, resourceId) {
		let groupPermissions = [];
		let userPermissions = [];
		return this.pgPool.pool().query(this.forTypeUserCollectionSql(type, [{id: resourceId}]))
			.then(this.transformFromRowsToPermissions)
			.then((transformedPermissions => {
				userPermissions = transformedPermissions;
				return userPermissions;
			}))
			.then(() => {
				return this.pgPool.pool().query(this.forTypeGroupCollectionSql(type, [{id: resourceId}]))
			})
			.then(this.transformFromRowsToPermissions)
			.then((transformedPermissions => {
				groupPermissions = transformedPermissions;
				return groupPermissions;
			}))
			.then(() => {
				return {
					user: userPermissions,
					group: groupPermissions
				}
			});
	}

	/**
	 *
	 * @param type {String} Type for retrieval of the permissions from the database.
	 * @param resources {Object[]} Resources to be handled. If none are supplied then empty array is returned.
	 * @param resources[].id {Number} Filter the resources that have no id or in a different column.
	 */
	forTypeCollection(type, resources) {
		if (!resources.length) {
			return Promise.resolve([]);
		}

		resources = resources.filter(resource => resource.id || resource._id);
		if (!resources.length) {
			return Promise.resolve([]);
		}

		let groupPermissions;
		return this.pgPool.query(this.forTypeGroupCollectionSql(type, resources))
			.then(this.transformFromRowsToPermissions)
			.then(pGroupPermissions => {
				groupPermissions = pGroupPermissions;
				return this.pgPool.query(this.forTypeUserCollectionSql(type, resources));
			})
			.then(this.transformFromRowsToPermissions)
			.then(userPermissions => {
			// How do we effectively map the information to the resources.
			resources.forEach(resource => {
				resource.permissions = {
					user: userPermissions.filter(permission => permission.resourceId == (resource.id || resource._id)),
					group: groupPermissions.filter(permission => permission.resourceId == (resource.id || resource._id)),
				};
			});

			return resources;
		});
		// Load all the data and map them towards the data for retrieval.
	}

	/**
	 * SQL for handling retrieving data about permissions for full collection, all items. With respect to groups.
	 * @private
	 * @param type {String} Type name used in the database.
	 * @param resources {Object[]}
	 * @param resources[].id {Number}
	 * @returns {string}
	 */
	forTypeGroupCollectionSql(type, resources) {
		let ids = resources.map(layer => layer.id || layer._id);
		return `SELECT * FROM ${this.schema}.group_permissions WHERE resource_type = '${type}' AND resource_id IN ('${ids.join(`','`)}')`;
	}

	/**
	 * SQL for handling retrieving data about permissions for full collection, all items. With respect to groups.
	 * @private
	 * @param type {String} Type name used in the database.
	 * @param resources {Object[]}
	 * @param resources[].id {Number} Id of the given resource.
	 * @returns {string}
	 */
	forTypeUserCollectionSql(type, resources) {
		let ids = resources.map(layer => layer.id || layer._id);
		return `SELECT * FROM ${this.schema}.permissions WHERE resource_type = '${type}' AND resource_id IN ('${ids.join(`','`)}')`;
	}
}

module.exports = PgPermissions;