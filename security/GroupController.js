let config = require('../config');
let logger = require('../common/Logger').applicationWideLogger;
let Promise = require('promise');

let PgGroups = require('./PgGroups');
let PgPermissions = require('./PgPermissions');
let Permission = require('./Permission');

/**
 * Rest controller for manipulating groups.
 * The system always contains default Group GUEST. Default setting for rights is that the userwho creates the concept has rights toward the concept.
 */
class GroupController {
    constructor(app, pool, schema) {
        app.get('/rest/group', this.readAll.bind(this));

		app.put('/rest/group/:id', this.update.bind(this));

		app.post('/rest/group', this.create.bind(this));
        app.post('/rest/member/group', this.addUserToGroup.bind(this));
        app.post('/rest/permission/group', this.addPermission.bind(this));

        app.delete('/rest/group/:id', this.delete.bind(this));
        app.delete('/rest/permission/group', this.removePermission.bind(this));
		app.delete('/rest/member/group', this.removeUserFromGroup.bind(this));

		this.groups = new PgGroups(pool, schema || config.postgreSqlSchema);
		this.permissions = new PgPermissions(pool, schema || config.postgreSqlSchema);
    }

    /**
     * It returns all groups to which current user has rights. This means that as a part of the rights there is right
     * to controll rights of other users and groups.
     * @param request
     * @param response
     */
    readAll(request, response) {
    	let groups;
        this.groups.json().then(pGroups => {
			groups = pGroups
				.filter(group => this.hasRights(request.session.user, Permission.READ, group._id));
			let promises = groups.map(element => {
				return this.permissions.forType(this.type, element._id).then(permissions => {
					element.permissions = permissions;
				});
			});
			return Promise.all(promises);
		}).then(() => {
            response.json({data: groups});
        }).catch(err => {
            logger.error("GroupController#readAll Error: ", err);
            response.status(500);
        })
    }

    /**
     * If the user have rights to add new group, then this method is used for creation of such group.
     * @param request
     * @param response
     */
    create(request, response) {
        if(!this.hasRights(request.session.user, 'POST')) {
            response.status(403);
            response.json({"status": "err"});
            return;
        }

        this.groups.add(request.body.name, request.session.user.id).then(result => {
        	return Promise.all([
				this.permissions.add(request.session.user.id, 'group', result.id, Permission.READ),
				this.permissions.add(request.session.user.id, 'group', result.id, Permission.UPDATE),
				this.permissions.add(request.session.user.id, 'group', result.id, Permission.DELETE)
			]);
		}).then(() => {
            response.json({status: "Ok"});
        }).catch(err => {
            logger.error("GroupController#create Error: ", err);
            response.status(500);
        });
    }

	/**
	 * If the user have rights to update the group, then this method is used for update of such group.
	 * @param request
	 * @param response
	 */
	update(request, response) {
		if(!this.hasRights(request.session.user, Permission.UPDATE)) {
			response.status(403);
			response.json({"status": "err"});
			return;
		}

		this.groups.update(request.params.id, request.body.name).then(() => {
			response.json({status: "Ok"});
		}).catch(err => {
			logger.error("GroupController#create Error: ", err);
			response.status(500);
		});
	}

    /**
     *
     * @param request
     * @param response
     */
    delete(request, response) {
        if(!this.hasRights(request.session.user, Permission.DELETE, request.params.id)) {
            response.status(403);
			response.json({"status": "err"});
            return;
        }

        this.groups.delete(request.params.id).then(() => {
            response.json({status: "Ok"});
        }).catch(err => {
            logger.error("GroupController#delete Error: ", err);
            response.status(500);
        });
    }

    addUserToGroup(request, response) {
		if(!request.session.user.hasPermission('group_member', Permission.CREATE, request.body.groupId)) {
			response.status(403);
			response.json({"status": "err"});
			return;
		}

		this.groups.addMember(request.body.userId, request.body.groupId, request.session.user.id).then(() => {
			response.json({status: "Ok"});
		}).catch(err => {
			logger.error("GroupController#delete Error: ", err);
			response.status(500);
		});
    }

    removeUserFromGroup(request, response) {
		if(!request.session.user.hasPermission('group_member', Permission.DELETE, request.body.groupId)) {
			response.status(403);
			response.json({"status": "err"});
			return;
		}

		this.groups.removeMember(request.body.userId, request.body.groupId).then(() => {
			response.json({status: "Ok"});
		}).catch(err => {
			logger.error("GroupController#delete Error: ", err);
			response.status(500);
		});
    }

    addPermission(request, response, next) {
        if(!request.session.user.hasPermission('group_permission', Permission.CREATE, request.body.groupId)) {
            response.status(403);
            response.json({"status": "err"});
            return;
        }

        this.permissions.addGroup(request.body.groupId, request.body.resourceType, request.body.resourceId, request.body.permission).then(() => {
            response.json({status: "Ok"});
        }).catch(err => {
            logger.error("GroupController#delete Error: ", err);
            response.status(500);
        });
    }

    removePermission(request, response, next) {
        if(!request.session.user.hasPermission('group_permission', Permission.DELETE, request.body.groupId)) {
            response.status(403);
            response.json({"status": "err"});
            return;
        }

        this.permissions.removeGroup(request.body.groupId, request.body.resourceType, request.body.resourceId, request.body.permission).then(() => {
            response.json({status: "Ok"});
        }).catch(err => {
            logger.error("GroupController#delete Error: ", err);
            response.status(500);
        });
    }

    hasRights(user, method, id) {
        return user.hasPermission('group', method, id);
    }
}

module.exports = GroupController;