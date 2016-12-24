let config = require('../config');
let os = require('os');
let should = require('should');

let DatabaseSchema = require('../../../postgresql/DatabaseSchema');
let PgPool = require('../../../postgresql/PgPool');
let PgTable = require('../../../data/PgTable');


describe('PgTable', () => {
	let schema, pool;
	let commonSchema = 'data_test';
	let table = new PgTable(`${commonSchema}.migration`);

	beforeEach(done => {
		pool = new PgPool({
			user: config.pgDataUser,
			database: config.pgDataDatabase,
			password: config.pgDataPassword,
			host: config.pgDataHost,
			port: config.pgDataPort
		});

		schema = new DatabaseSchema(pool, commonSchema);
		schema.create().then(() => {
			return pool.pool().query(`insert into ${commonSchema}.migration (name) VALUES ('test')`);
		}).then(() => {
			done();
		}).catch(err => {
			done(err);
		});
	});

	describe('#asSql', () => {
		it('returns correct sql for the full recreation of the table', (done) => {
			if (os.platform() != 'linux') {
				done();
				return;
			}

			table.asSql().then(result => {
				should(result).equal(`--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.4
-- Dumped by pg_dump version 9.5.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

SET search_path = data_test, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: migration; Type: TABLE; Schema: data_test; Owner: geonode
--

CREATE TABLE migration (
    id integer NOT NULL,
    name character varying(128)
);


ALTER TABLE migration OWNER TO geonode;

--
-- Name: migration_id_seq; Type: SEQUENCE; Schema: data_test; Owner: geonode
--

CREATE SEQUENCE migration_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE migration_id_seq OWNER TO geonode;

--
-- Name: migration_id_seq; Type: SEQUENCE OWNED BY; Schema: data_test; Owner: geonode
--

ALTER SEQUENCE migration_id_seq OWNED BY migration.id;


--
-- Name: id; Type: DEFAULT; Schema: data_test; Owner: geonode
--

ALTER TABLE ONLY migration ALTER COLUMN id SET DEFAULT nextval('migration_id_seq'::regclass);


--
-- Data for Name: migration; Type: TABLE DATA; Schema: data_test; Owner: geonode
--

COPY migration (id, name) FROM stdin;
1       test
\.


--
-- Name: migration_id_seq; Type: SEQUENCE SET; Schema: data_test; Owner: geonode
--

SELECT pg_catalog.setval('migration_id_seq', 1, true);


--
-- Name: migration_pkey; Type: CONSTRAINT; Schema: data_test; Owner: geonode
--

ALTER TABLE ONLY migration
    ADD CONSTRAINT migration_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--`);
				done();
			}).catch(err => {
				done(err);
			});
		});
	});

	afterEach(done => {
		schema.drop().then(function () {
			done();
		}).catch(err => {
			done(err);
		});
	})
});