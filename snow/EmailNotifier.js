let config = require(`../config`);

let nodemailer = require(`nodemailer`);

class EmailNotifier {
    constructor(pgPool) {
        this._pgPool = pgPool;
        this._transporter = nodemailer.createTransport({
            host: config.email.host,
            port: config.email.port,
            secure: false, // secure:true for port 465, secure:false for port 587
            auth: {
                user: config.email.user,
                pass: config.email.password
            }
        });
    }

    send(email, message) {
        let mailOptions = {
            from: config.email.from,
            to: email,
            subject: config.email.subject,
            html: message
        };

        return new Promise((resolve, reject) => {
            this._transporter.sendMail(mailOptions, (error, info) => {
                if(error) {
                    reject(error);
                } else {
                    resolve(this._uuid);
                }
            });
        });
    }
}

module.exports = EmailNotifier;