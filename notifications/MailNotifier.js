const nodemailer = require('nodemailer');

class MailNotifier {
	constructor(transportSettings) {
		this._transporter = nodemailer.createTransport(transportSettings);
	}

	send(from, to, subject, text, html) {
		return this._transporter.sendMail(
			{
				from,
				to,
				subject,
				text,
				html
			}
		)
	}
}

module.exports = MailNotifier;