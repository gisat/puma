let config = require('../config');
let logger = require('../common/Logger').applicationWideLogger;
let Promise = require('promise');

let PgGroups = require('./PgGroups');
let PgPermissions = require('./PgPermissions');
let PgTransaction = require('../postgresql/PgTransaction');
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
        app.delete('/rest/group/:id', this.delete.bind(this));

		this.groups = new PgGroups(pool, schema || config.postgreSqlSchema);
		this.permissions = new PgPermissions(pool, schema || config.postgreSqlSchema);
		this.transaction = new PgTransaction(pool);
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
			// I am missing information about rights towards this group.
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
	 * The structure for update of the group. Tthe Patch approach is applied with respect to what is changed for the
	 * group. It means that when I provide the name, name is changed otherwise it is ignored. The same applies for
	 * the permissions if they are provided, they represent the current state.
	 * {
	 		name: "Example",

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
	 * }
	 * @param request
	 * @param response
	 */
	update(request, response) {
		if(!this.hasRights(request.session.user, Permission.UPDATE)) {
			response.status(403);
			response.json({"status": "err"});
			return;
		}

		let id = request.params.id;
		let group = request.body.group;

		let currentUserId = request.session.user.id;

		this.transaction.start().then(() => {
            return this.groups.update(id, group, currentUserId);
		}).then(() => {
			return this.transaction.end();
		}).then(() => {
            response.json({status: "Ok"});
		}).catch(err => {
			logger.error("GroupController#create Error: ", err);
			this.transaction.rollback();
			response.status(500);
		});
	}

    /**
     * With sufficient rights, this deletes the group. 
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

    hasRights(user, method, id) {
        return user.hasPermission('group', method, id);
    }
}

module.exports = GroupController;