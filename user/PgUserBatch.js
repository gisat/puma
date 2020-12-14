const config = require(`../config`);
const bcrypt = require(`bcrypt`);
const MailNotifier = require(`../notifications/MailNotifier`);

class PgUserBatch {
	constructor(pgPool, pgSchema) {
		this._pgPool = pgPool;
		this._pgSchema = pgSchema;

		this._fromEmail = `lpis-admin@gisat.cz`;
		this._mailNotifier = new MailNotifier({
			host: "zimbra.gisat.cz",
			secure: true,
			auth: {
				user: `lpis-admin`,
				pass: `Lp82=QwEvXz`
			}
		})
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
				return this.getGroupIdsForUser(user);
			})
			.then((groupIds) => {
				if (!groupIds || !groupIds.length) {
					throw new Error(`Unable find groups to assign this user to!`);
				} else {
					processedUser.groupIds = groupIds;
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
		if (processedUser.id) {
			return this._pgPool
				.query(
					`DELETE FROM "${config.pgSchema.data}"."panther_users" WHERE id = ${processedUser.id};`
					+ `DELETE FROM "${config.pgSchema.data}"."group_has_members" WHERE user_id = ${processedUser.id};`
				)
		}
	}

	notifiyUser(processedUser) {
		return this._mailNotifier
			.send(
				`"GISAT LPIS update" <${this._fromEmail}>`,
				processedUser.email,
				`Vyhodnocení snímků z družic Sentinels pro potřeby aktualizace LPIS`,
				`Dobrý den\nposíláme Vám Vaše přístupové údaje do aplikace pro detekci rizikových DPB a PB.\n\nhttps://lpischeck.gisat.cz/\nE-Mail: ${processedUser.email}\nHeslo: ${processedUser.password}\n\nV případě jakýchkoliv technických problémů s přihlášením nebo funkčností aplikace nás informujte na e-mailové adrese lpis-admin@gisat.cz.\n\nDěkujeme.\nGISAT s.r.o.\nwww.gisat.cz\n`
			)
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
		return this._pgPool
			.query(`SELECT * FROM "${config.pgSchema.data}"."groups"`)
			.then((pgResult) => {
				return pgResult.rows;
			})
			.then((groups) => {
				return _.map(
					_.filter(
						groups, (group) => {
							if (user.groups && user.groups.includes(group.name)) {
								return true;
							}
						}
					), (group) => {
						return group.id;
					}
				)
			})
	}
}

module.exports = PgUserBatch;