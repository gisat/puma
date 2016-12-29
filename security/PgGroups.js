let Group = require('./Group');
let PgPermissions = require('./PgPermissions');
let moment = require('moment');
let _ = require('underscore');

class PgGroups {
    constructor(pgPool, schema) {
        this.pgPool = pgPool;
        this.schema = schema;

        this.permissions = new PgPermissions(pgPool, schema);
    }

    byId(id) {
        let groups;
        return this.pgPool.pool().query(this.byIdSql(id)).then((result => {
            groups = result.rows.map(group => new Group(group.id, null, group.name, group.created, group.created_by, group.changed, group.changed_by));
            return this.permissions.forGroup(groups[0].id);
        })).then((permissions => {
            groups[0].permissions = permissions;
            return groups[0];
        }))
    }

    byIdSql(id) {
        return `SELECT * FROM ${this.schema}.groups WHERE id = ${id}`;
    }

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

    forUser(userId) {
        return this.pgPool.pool().query(this.forUserSql(userId)).then(result => {
            return result.rows.map(group => new Group(group.id, null, group.name));
        });
    }

    forUserSql(userId) {
        return `SELECT groups.id, groups.name FROM ${this.schema}.groups join ${this.schema}.group_has_members ON groups.id=group_has_members.group_id WHERE group_has_members.user_id = ${userId} GROUP BY groups.id, groups.name`;
    }

    add(name, userId) {
        return this.pgPool.pool().query(this.addSql(name, userId)).then(result => {
            return this.byId(result.rows[0].id);
        });
    }

    addSql(name, userId) {
        let time = moment().format('YYYY-MM-DD HH:mm:ss');
        return `INSERT INTO ${this.schema}.groups (name, created, created_by, changed, changed_by) VALUES ('${name}', '${time}', ${userId}, '${time}', ${userId}) RETURNING id`;
    }

    delete(id) {
        return this.pgPool.pool().query(this.deleteSql(id));
    }

    deleteSql(id) {
        return `DELETE FROM ${this.schema}.groups WHERE id = ${id}`;
    }

    addMember(userId, groupId, creatorId) {
        return this.pgPool.pool().query(this.addMemberSql(userId, groupId, creatorId));
    }

    addMemberSql(userId, groupId, creatorId) {
        let time = moment().format('YYYY-MM-DD HH:mm:ss');
        return `INSERT INTO ${this.schema}.group_has_members (group_id, user_id, created, created_by, changed, changed_by) 
            VALUES (${groupId},${userId}, '${time}', ${creatorId}, '${time}', ${creatorId})`;
    }

    removeMember(userId, groupId) {
        return this.pgPool.pool().query(this.removeMemberSql(userId, groupId));
    }

    removeMemberSql(userId, groupId) {
        return `DELETE FROM ${this.schema}.group_has_members WHERE user_id = ${userId} AND group_id = ${groupId}`;
    }
}

module.exports = PgGroups;