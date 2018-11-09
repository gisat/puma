const PgPermissions = require('../security/PgPermissions');
const Permission = require('../security/Permission');

class PgPermissionController {
	constructor(app, pgPool, pgSchema) {
		this._pgPermissions = new PgPermissions(pgPool, pgSchema);

		app.post(`/rest/permission`, this.create.bind(this));

		app.get(`/rest/permission`, this.get.bind(this));
		app.post(`/rest/permission/filtered`, this.get.bind(this));

		app.delete(`/rest/permission`, this.delete.bind(this));

		app.put(`/rest/permission`, this.update.bind(this))
	}

	create(request, response) {
		let user = request.session.user;
		let permission = request.body.data;

		if(user.hasPermission(`permission`, Permission.CREATE)) {
			if(permission.user_id !== undefined) {
				this._pgPermissions
					.add(permission.user_id, permission.resource_type, permission.resource_id, permission.permission)
					.then(() => {
						response.status(200).send({data: {}, success: true});
					});
			} else if(permission.group_id !== undefined) {
				this._pgPermissions
					.addGroup(permission.group_id, permission.resource_type, permission.resource_id, permission.permission)
					.then(() => {
						response.status(200).send({data: {}, success: true});
					});
			} else {
				response.status(500).send({message: `missing user or group id`, success: false});
			}
		} else {
			response.status(403).send({message: `forbidden`, success: false});
		}
	}

	update(request, response) {
		response.status(500).send({message: `not implemented`, success: false});
	}

	get(request, response) {
		response.status(500).send({message: `not implemented`, success: false});
	}

	delete(request, response) {
		let user = request.session.user;
		let permission = request.body.data;

		if(user.hasPermission(`permission`, Permission.CREATE)) {
			if(permission.user_id !== undefined) {
				this._pgPermissions
					.remove(permission.user_id, permission.resource_type, permission.resource_id, permission.permission)
					.then(() => {
						response.status(200).send({data: {}, success: true});
					});
			} else if(permission.group_id !== undefined) {
				this._pgPermissions
					.removeGroup(permission.group_id, permission.resource_type, permission.resource_id, permission.permission)
					.then(() => {
						response.status(200).send({data: {}, success: true});
					});
			} else {
				response.status(500).send({message: `missing user or group id`, success: false});
			}
		} else {
			response.status(403).send({message: `forbidden`, success: false});
		}
	}
}

module.exports = PgPermissionController;