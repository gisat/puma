let logger = require('../common/Logger').applicationWideLogger;
let UUID = require('../common/UUID');

let nodemailer = require('nodemailer');

/**
 * It represents invitation to the system for the new user. The Pg version stores the information in the PostgreSQL
 * database.
 */
class PgMailInvitation {
    constructor(pool, schema, mail, uuid) {
        this._pool = pool;
        this._schema = schema;

        this._uuid = uuid || new UUID().toString();

        this._mail = mail;
        this._transporter = nodemailer.createTransport({
            host: mail.host,
            port: mail.port,
            secure: true, // secure:true for port 465, secure:false for port 587
            auth: {
                user: mail.user,
                pass: mail.pass
            }
        });
    }

    /**
     * It stores the email and associated hash inside of the database.
     */
    send(email, baseUrl) {
        logger.info(`PgMailInvitation#send Email: ${email}, BaseUrl: ${baseUrl}, Hash: ${this._uuid}`);

        let url = `${baseUrl}/rest/user/invitation/${this._uuid}`;
        return this._pool.query(`INSERT INTO ${this._schema}.invitation (email, hash) values ('${email}','${this._uuid}')`).then(() => {
            let mailOptions = {
                from: this._mail.from,
                to: email,
                subject: this._mail.subject,
                html: `
                    <p>Hello</p>
                    <p>
                       You were invited to the system for visualisation and analysis of the data. If this email wasn't 
                       intended for you, just ignore it. If it is, please follow to the following URL: 
                       <a href="${url}">${url}</a>
                    </p> 
                `
            };

            return new Promise(function(resolve, reject){
                this._transporter.sendMail(mailOptions, (error, info) => {
                    if(error) {
                        reject(error);
                    } else {
                        resolve(this._uuid);
                    }
                });
            });
        });
    }

    /**
     * It verifies whether there is email for given hash. If there is one, then it returns the email. Otherwise it
     * throws Error.
     */
    verify() {
        logger.info(`PgMailInvitation#verify Uuid: ${this._uuid}`);

        return this._pool.query(`SELECT email FROM ${this}.invitation WHERE hash = '${this._uuid};'`).then(result => {
            if(result.rows.length === 0) {
                throw new Error('Invalid hash');
            }

            return result.rows[0].email;
        })
    }
}

module.exports = PgMailInvitation;