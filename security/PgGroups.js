let Group = require('./Group');
let PgPermissions = require('./PgPermissions');
let moment = require('moment');

class PgGroups {
    constructor(pgPool, schema) {
        this.pgPool = pgPool;
        this.schema = schema;

        this.permissions = new PgPermissions(pgPool, schema);
    }

    byId(id) {
        let groups;
        return this.pgPool.pool().query(this.byIdSql(id)).then((result => {
            groups = result.rows.map(group => new Group(group.id, null, group.name));
            return this.permissions.forGroup(groups[0].id);
        })).then((permissions => {
            groups[0].permissions = permissions;
            return groups[0];
        }))
    }

    byIdSql(id) {
        return `SELECT * FROM ${this.schema}.groups WHERE id = ${id}`;
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
        return this.pgPool.pool().query(this.addSql(name, userId));
    }

    addSql(name, userId) {
        let time = moment().format('YYYY-MM-DD HH:mm:ss');
        return `INSERT INTO ${this.schema}.groups (name, created, created_by, changed, changed_by) VALUES ('${name}', '${time}', ${userId}, '${time}', ${userId})`;
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