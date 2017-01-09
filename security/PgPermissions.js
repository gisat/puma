/**
 * It represents permissions stored in the PostgreSQL database.
 * @alias PgPermissions
 * @constructor
 */
class PgPermissions {
	constructor(pgPool, schema) {
		this.pgPool = pgPool;
		this._schema = schema;
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
		return `SELECT * FROM ${this._schema}.permissions WHERE user_id = ${userId}`;
	}

	forGroup(groupId) {
		return this.pgPool.pool().query(this.forGroupSql(groupId))
			.then(this.transformFromRowsToPermissions);
	}

	forGroupSql(groupId) {
		return `SELECT * from ${this._schema}.group_permissions WHERE group_id = ${groupId}`;
	}

	/**
	 * It adds permission to the user for given resource type and id.
	 * @param userId {Number} Id of the user
	 * @param resourceType {String} Type of the resource toward which the rights are valid.
	 * @param resourceId {Number} Id of the resource
	 * @param permission {String} One of these GET, POST, PUT, DELETE, ADMINISTER
	 */
	add(userId, resourceType, resourceId, permission) {
		return this.pgPool.pool().query(this.addSql(userId, resourceType, resourceId, permission));
	}

	// Private
	addSql(userId, resourceType, resourceId, permission) {
		return `INSERT INTO ${this._schema}.permissions (user_id, resource_type, resource_id, permission) VALUES (${userId}, '${resourceType}', ${resourceId}, '${permission}')`;
	}

	addGroup(groupId, resourceType, resourceId, permission) {
		return this.pgPool.pool().query(this.addGroupSql(groupId, resourceType, resourceId, permission));
	}

	addGroupSql(groupId, resourceType, resourceId, permission) {
		return `INSERT INTO ${this._schema}.group_permissions (group_id, resource_type, resource_id, permission) VALUES (${groupId}, '${resourceType}', ${resourceId}, '${permission}')`;
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

	// Private
	removeSql(userId, resourceType, resourceId, permission) {
		let andResourceId = '';
		if (resourceId) {
			andResourceId = ` AND resource_id = ${resourceId} `;
		}
		return `DELETE FROM ${this._schema}.permissions WHERE user_id = ${userId} AND resource_type = '${resourceType}' ${andResourceId} AND permission = '${permission}'`;
	}

	removeGroup(groupId, resourceType, resourceId, permission) {
		return this.pgPool.pool().query(this.removeGroupSql(groupId, resourceType, resourceId, permission));
	}

	removeGroupSql(groupId, resourceType, resourceId, permission) {
		let andResourceId = '';
		if (resourceId) {
			andResourceId = ` AND resource_id = ${resourceId} `;
		}
		return `DELETE FROM ${this._schema}.group_permissions WHERE group_id = ${groupId} AND resource_type = '${resourceType}' ${andResourceId} AND permission = '${permission}'`;
	}

	forType(type, resourceId) {
		let groupPermissions = [];
		let userPermissions = [];
		return this.pgPool.pool().query(this.forTypeUserSql(type, resourceId))
			.then(this.transformFromRowsToPermissions)
			.then((transformedPermissions => {
				userPermissions = transformedPermissions;
				return userPermissions;
			}))
			.then(() => {
				return this.pgPool.pool().query(this.forTypeGroupSql(type, resourceId))
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

	forTypeGroupSql(type, resourceId) {
		return `SELECT * from ${this._schema}.group_permissions WHERE resource_type = '${type}' AND resource_id=${resourceId}`;
	}

	forTypeUserSql(type, resourceId) {
		return `SELECT * from ${this._schema}.permissions WHERE resource_type = '${type}' AND resource_id=${resourceId}`;
	}
}

module.exports = PgPermissions;