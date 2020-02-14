const config = require(`../config`);
const nodemailer = require(`nodemailer`);
const bcrypt = require(`bcrypt`);

class PgUserBatch {
	constructor(pgPool, pgSchema) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;

		this._fromEmail = `lpis-admin@gisat.cz`;
		this._transporter = nodemailer.createTransport({
			host: "zimbra.gisat.cz",
			secure: true,
			auth: {
				user: `lpis-admin`,
				pass: `Lp82=QwEvXz`
			}
		});
	}

	create(users) {
		return Promise
			.resolve()
			.then(async () => {
				let processedUsers = [];
				for (let user of users) {
					await this.createUser(user)
						.then((processedUser) => {
							if (processedUser) {
								processedUsers.push(processedUser);
							}
						})
				}
				return processedUsers;
			})
	}

	createUser(user) {
		let processedUser = {
			...user,
			created: false,
			notified: false,
			message: null
		};

		return Promise
			.resolve()
			.then(() => {
				processedUser.groupIds = this.getGroupIdsForUser(user);

				if (!processedUser.groupIds || !processedUser.groupIds.length) {
					throw new Error(`Unable find groups to assign this user to!`);
				}
			})
			.then(() => {
				return this._pgPool.query(`SELECT COUNT(*) FROM "${this._pgSchema}"."panther_users" WHERE email = '${user.email}'`)
					.then((pgResult) => {
						if (pgResult.rows[0].count > 0) {
							throw new Error(`User with this email already exists!`);
						}
					})
			})
			.then(() => {
				if (!user.password) {
					processedUser.password = this.getRandomPassword();
				}
			})
			.then(() => {
				return this.createDatabaseRecordsForUser(processedUser);
			})
			.then(() => {
				return this.notifiyUser(processedUser);
			})
			.catch((error) => {
				processedUser.message = error.message;
				processedUser.created = false;
				return this.clearUserRecordsOnError(processedUser);
			})
			.then(() => {
				return processedUser;
			})
	}

	clearUserRecordsOnError(processedUser) {
		if(processedUser.id) {
			return this._pgPool
				.query(
					`DELETE FROM "${config.pgSchema.data}"."panther_users" WHERE id = ${processedUser.id};`
					+ `DELETE FROM "${config.pgSchema.data}"."group_has_members" WHERE user_id = ${processedUser.id};`
				)
		}
	}

	notifiyUser(processedUser) {
		return this._transporter
			.sendMail({
				from: this._fromEmail,
				to: processedUser.email,
				subject: `Přístup na https://lpisup.gisat.cz`,
				text: `Dobrý den\nNa serveru https://lpisup.gisat.cz Vám byl založen uživatelský účet.\n\nPro přihlášení použijte následující údaje:\nJméno: ${processedUser.email}\nHeslo: ${processedUser.password}`
			})
			.then(() => {
				processedUser.notified = true;
			})
	}

	createDatabaseRecordsForUser(processedUser) {
		let userPasswordHash = bcrypt.hashSync(processedUser.password, 10);

		return this._pgPool
			.query(
				`INSERT INTO "${this._pgSchema}"."panther_users" ("name", "email", "password") VALUES ('${processedUser.name}', '${processedUser.email}', '${userPasswordHash}') RETURNING "id";`
			)
			.then((pgResult) => {
				if (pgResult.rows.length) {
					processedUser.id = pgResult.rows[0].id
				} else {
					throw new Error(`Unable to create user record!`);
				}
			})
			.then(() => {
				let sql = [];
				_.each(processedUser.groupIds, (groupId) => {
					sql.push(
						`INSERT INTO "${this._pgSchema}"."group_has_members" ("group_id", "user_id") VALUES (${Number(groupId)}, ${Number(processedUser.id)})`
					)
				});

				if (sql.length) {
					return this._pgPool.query(sql.join(`;`));
				}
			})
			.then(() => {
				processedUser.created = true;
			})
	}

	getRandomPassword() {
		return Math.random().toString(36).substr(2, 8);
	}

	getGroupIdsForUser(user) {
		if (!config.customData || !config.customData["data.groups"]) {
			return [];
		}

		return _.map(
			_.filter(
				config.customData["data.groups"], (group) => {
					if (user.groupName && user.groupName === group.name) {
						return true;
					}

					if (
						user.region === `centrala`
						&& user.role
						&& user.role.includes(`admin`)
						&& group.name === `SZIF správci`
					) {
						return true;
					}

					if (
						user.region
						&& user.region !== `centrala`
						&& user.role
						&& user.role.includes(`admin`)
						&& (
							group.name === `${user.region} správci`
							|| group.name === user.region
							|| group.name === `SZIF regionální správci`
						)
					) {
						return true;
					}

					if (
						user.region
						&& user.region !== `centrala`
						&& user.role
						&& user.role.includes(`pracovnik`)
						&& (
							group.name === user.region
							|| group.name === `SZIF uživatelé`
						)
					) {
						return true;
					}
				}
			), (group) => {
				return group.id;
			}
		)
	}
}

module.exports = PgUserBatch;