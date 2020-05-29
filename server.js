const cluster = require('cluster');

const Routes = require('./routes/Routes');
const PgPool = require('./postgresql/PgPool');
const UserAuthentication = require('./auth/UserAuthentication');

const config = require('./config');
const db = require('./db');

const initMaster = () => {
	const PgDatabase = require('./postgresql/PgDatabase');

	new PgDatabase()
		.ensure()
		.then(() => {
			// new Routes(null, new PgPool().getPool(), true).init();
		})
		.then(() => {
			return initWorkers();
		})
		.catch((error) => {
			console.log(`#ERROR#`, error)
		});
}

const initWorkers = () => {
	const os = require('os');
	const cpuCount = os.cpus().length;

	for(let i = 0; i < cpuCount && i < (config.clusterPorts.length); i++) {
		let port = config.clusterPorts[i];
		createWorker({port});
	}
}

const initWorker = () => {
	const express = require('express');
	const cookieParser = require('cookie-parser');
	const bodyParser = require('body-parser');

	db.init();
	const pgPool = db.getPool();

	const app = express();

	app.use(cookieParser());
	app.use(bodyParser.json());
	app.use((request, response, next) => {
		new UserAuthentication(pgPool).authenticate(request, response, next);
	});

	app.listen(process.env.port, () => {
		new Routes(app, pgPool).init();
		console.log(`#NOTE# Cluster worker id ${cluster.worker.id} is listening on port ${process.env.port}`);
	});
}

const createWorker = (env) => {
	let worker = cluster.fork(env);
	worker.process.env = env;

	if(config.keepAliveWorkers) {
		worker.on("exit", () => {
			console.log(`#NOTE# Worker ${worker.id} died`);
			createWorker(env);
		})
	}
}

process.on(`uncaughtException`, (error) => {
	console.log(`#ERROR#`, error)
});

if(cluster.isMaster) {
	initMaster();
} else {
	initWorker();
}

