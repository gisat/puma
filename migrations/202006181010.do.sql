--
-- PostgreSQL database dump
--

-- Dumped from database version 12.3
-- Dumped by pg_dump version 12.3

--
-- Name: analysis; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA analysis;


--
-- Name: application; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA application;


--
-- Name: data; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA data;


--
-- Name: dataSources; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "dataSources";


--
-- Name: metadata; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA metadata;


--
-- Name: permissions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA permissions;


--
-- Name: relations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA relations;


--
-- Name: specific; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA specific;


--
-- Name: user; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA "user";


--
-- Name: various; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA various;


--
-- Name: views; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA views;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry, geography, and raster spatial types and functions';

--
-- Name: application; Type: TABLE; Schema: application; Owner: -
--

CREATE TABLE application.application (
    key text DEFAULT public.gen_random_uuid() NOT NULL,
    name text,
    description text,
    color text
);


--
-- Name: configuration; Type: TABLE; Schema: application; Owner: -
--

CREATE TABLE application.configuration (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    data jsonb
);


--
-- Name: layerTree; Type: TABLE; Schema: application; Owner: -
--

CREATE TABLE application."layerTree" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameInternal" text,
    structure jsonb[]
);


--
-- Name: attributeDataSource; Type: TABLE; Schema: dataSources; Owner: -
--

CREATE TABLE "dataSources"."attributeDataSource" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameInternal" text,
    attribution text,
    "tableName" text,
    "columnName" text
);


--
-- Name: dataSource; Type: TABLE; Schema: dataSources; Owner: -
--

CREATE TABLE "dataSources"."dataSource" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameInternal" text,
    attribution text,
    type text,
    "sourceKey" uuid
);


--
-- Name: raster; Type: TABLE; Schema: dataSources; Owner: -
--

CREATE TABLE "dataSources".raster (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "layerName" text,
    "tableName" text
);


--
-- Name: vector; Type: TABLE; Schema: dataSources; Owner: -
--

CREATE TABLE "dataSources".vector (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "layerName" text,
    "tableName" text
);


--
-- Name: wms; Type: TABLE; Schema: dataSources; Owner: -
--

CREATE TABLE "dataSources".wms (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    url text,
    layers text,
    styles text,
    configuration jsonb
);


--
-- Name: wmts; Type: TABLE; Schema: dataSources; Owner: -
--

CREATE TABLE "dataSources".wmts (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    urls text[]
);


--
-- Name: areaTree; Type: TABLE; Schema: metadata; Owner: -
--

CREATE TABLE metadata."areaTree" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameDisplay" text,
    "nameInternal" text,
    description text
);


--
-- Name: areaTreeLevel; Type: TABLE; Schema: metadata; Owner: -
--

CREATE TABLE metadata."areaTreeLevel" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameDisplay" text,
    "nameInternal" text,
    description text,
    level integer
);


--
-- Name: attribute; Type: TABLE; Schema: metadata; Owner: -
--

CREATE TABLE metadata.attribute (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameDisplay" text,
    "nameInternal" text,
    description text,
    type text,
    unit text,
    "valueType" text,
    color text
);


--
-- Name: attributeSet; Type: TABLE; Schema: metadata; Owner: -
--

CREATE TABLE metadata."attributeSet" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameDisplay" text,
    "nameInternal" text,
    description text
);


--
-- Name: case; Type: TABLE; Schema: metadata; Owner: -
--

CREATE TABLE metadata."case" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameDisplay" text,
    "nameInternal" text,
    description text
);


--
-- Name: layerTemplate; Type: TABLE; Schema: metadata; Owner: -
--

CREATE TABLE metadata."layerTemplate" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameDisplay" text,
    "nameInternal" text,
    description text
);


--
-- Name: period; Type: TABLE; Schema: metadata; Owner: -
--

CREATE TABLE metadata.period (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameDisplay" text,
    "nameInternal" text,
    description text,
    period text,
    start timestamp with time zone,
    "end" timestamp with time zone
);


--
-- Name: place; Type: TABLE; Schema: metadata; Owner: -
--

CREATE TABLE metadata.place (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameDisplay" text,
    "nameInternal" text,
    description text,
    geometry public.geometry,
    bbox public.geometry
);


--
-- Name: scenario; Type: TABLE; Schema: metadata; Owner: -
--

CREATE TABLE metadata.scenario (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameDisplay" text,
    "nameInternal" text,
    description text
);


--
-- Name: scope; Type: TABLE; Schema: metadata; Owner: -
--

CREATE TABLE metadata.scope (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameDisplay" text,
    "nameInternal" text,
    description text,
    configuration jsonb
);


--
-- Name: style; Type: TABLE; Schema: metadata; Owner: -
--

CREATE TABLE metadata.style (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameDisplay" text,
    "nameInternal" text,
    description text,
    source text,
    definition jsonb,
    "nameGeoserver" text
);


--
-- Name: tag; Type: TABLE; Schema: metadata; Owner: -
--

CREATE TABLE metadata.tag (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameDisplay" text,
    "nameInternal" text,
    description text,
    color text
);


--
-- Name: areaRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."areaRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "areaTreeKey" uuid,
    "areaTreeLevelKey" uuid,
    "fidColumnName" text,
    "parentFidColumnName" text,
    "spatialDataSourceKey" uuid,
    "scopeKey" uuid,
    "placeKey" uuid,
    "periodKey" uuid,
    "caseKey" uuid,
    "scenarioKey" uuid,
    "applicationKey" text
);


--
-- Name: areaTreeLevelRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."areaTreeLevelRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentAreaTreeLevelKey" uuid,
    "areaTreeKey" uuid,
    "applicationKey" text,
    "tagKey" uuid
);


--
-- Name: areaTreeRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."areaTreeRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentAreaTreeKey" uuid,
    "scopeKey" uuid,
    "applicationKey" text,
    "tagKey" uuid
);


--
-- Name: attributeDataSourceRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."attributeDataSourceRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "scopeKey" uuid,
    "periodKey" uuid,
    "placeKey" uuid,
    "attributeDataSourceKey" uuid,
    "layerTemplateKey" uuid,
    "scenarioKey" uuid,
    "caseKey" uuid,
    "attributeSetKey" uuid,
    "attributeKey" uuid,
    "areaTreeLevelKey" uuid,
    "fidColumnName" text,
    "applicationKey" text
);


--
-- Name: attributeRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."attributeRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentAttributeKey" uuid,
    "applicationKey" text,
    "tagKey" uuid
);


--
-- Name: attributeSetRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."attributeSetRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentAttributeSetKey" uuid,
    "applicationKey" text,
    "tagKey" uuid
);


--
-- Name: caseRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."caseRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentCaseKey" uuid,
    "applicationKey" text,
    "tagKey" uuid
);


--
-- Name: configurationRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."configurationRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentConfigurationKey" uuid,
    "applicationKey" text
);


--
-- Name: esponFuoreIndicatorRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."esponFuoreIndicatorRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentEsponFuoreIndicatorKey" uuid,
    "attributeKey" uuid,
    "viewKey" uuid,
    "tagKey" uuid,
    "scopeKey" uuid
);


--
-- Name: layerTemplateRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."layerTemplateRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentLayerTemplateKey" uuid,
    "scopeKey" uuid,
    "applicationKey" text,
    "tagKey" uuid
);


--
-- Name: layerTreeRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."layerTreeRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentLayerTreeKey" uuid,
    "scopeKey" uuid,
    "applicationKey" text
);


--
-- Name: lpisChangeCaseRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."lpisChangeCaseRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentLpisChangeCaseKey" uuid,
    "viewKey" uuid,
    "tagKey" uuid
);


--
-- Name: periodRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."periodRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentPeriodKey" uuid,
    "applicationKey" text,
    "scopeKey" uuid,
    "tagKey" uuid
);


--
-- Name: permissionsRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."permissionsRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentPermissionsKey" uuid,
    "usersKey" uuid,
    "groupsKey" uuid
);


--
-- Name: placeRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."placeRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentPlaceKey" uuid,
    "applicationKey" text,
    "tagKey" uuid
);


--
-- Name: scenarioRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."scenarioRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentScenarioKey" uuid,
    "applicationKey" text,
    "tagKey" uuid
);


--
-- Name: scopeRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."scopeRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentScopeKey" uuid,
    "applicationKey" text,
    "tagKey" uuid
);


--
-- Name: spatialDataSourceRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."spatialDataSourceRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "scopeKey" uuid,
    "periodKey" uuid,
    "placeKey" uuid,
    "spatialDataSourceKey" uuid,
    "layerTemplateKey" uuid,
    "scenarioKey" uuid,
    "caseKey" uuid,
    "fidColumnName" text,
    "applicationKey" text
);


--
-- Name: styleRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."styleRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentStyleKey" uuid,
    "applicationKey" text,
    "tagKey" uuid
);


--
-- Name: tagRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."tagRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentTagKey" uuid,
    "applicationKey" text,
    "scopeKey" uuid,
    "tagKey" uuid
);


--
-- Name: usersRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."usersRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentUsersKey" uuid,
    "groupsKey" uuid
);


--
-- Name: viewRelation; Type: TABLE; Schema: relations; Owner: -
--

CREATE TABLE relations."viewRelation" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "parentViewKey" uuid,
    "applicationKey" text
);


--
-- Name: esponFuoreIndicator; Type: TABLE; Schema: specific; Owner: -
--

CREATE TABLE specific."esponFuoreIndicator" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameDisplay" text,
    "nameInternal" text,
    description text,
    type text
);


--
-- Name: lpisChangeCase; Type: TABLE; Schema: specific; Owner: -
--

CREATE TABLE specific."lpisChangeCase" (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "submitDate" timestamp without time zone,
    "codeDpb" text,
    "codeJi" text,
    "caseKey" text,
    "changeDescription" text,
    "changeDescriptionPlace" text,
    "changeDescriptionOther" text,
    "evaluationResult" text,
    "evaluationDescription" text,
    "evaluationDescriptionOther" text,
    "evaluationUsedSources" text,
    "geometryBefore" public.geometry,
    "geometryAfter" public.geometry,
    status text
);


--
-- Name: groupPermissions; Type: TABLE; Schema: user; Owner: -
--

CREATE TABLE "user"."groupPermissions" (
    "groupKey" uuid NOT NULL,
    "permissionKey" uuid NOT NULL
);


--
-- Name: groups; Type: TABLE; Schema: user; Owner: -
--

CREATE TABLE "user".groups (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    name text
);


--
-- Name: permissions; Type: TABLE; Schema: user; Owner: -
--

CREATE TABLE "user".permissions (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "resourceKey" text,
    "resourceType" text,
    permission text
);


--
-- Name: userGroups; Type: TABLE; Schema: user; Owner: -
--

CREATE TABLE "user"."userGroups" (
    "userKey" uuid NOT NULL,
    "groupKey" uuid NOT NULL
);


--
-- Name: userPermissions; Type: TABLE; Schema: user; Owner: -
--

CREATE TABLE "user"."userPermissions" (
    "userKey" uuid NOT NULL,
    "permissionKey" uuid NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: user; Owner: -
--

CREATE TABLE "user".users (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    email text,
    name text,
    password text,
    phone text,
    other jsonb
);


--
-- Name: v_userPermissions; Type: VIEW; Schema: user; Owner: -
--

CREATE VIEW "user"."v_userPermissions" AS
 SELECT p."resourceType",
    p."resourceKey",
    p.permission,
    up."userKey"
   FROM ("user".permissions p
     JOIN "user"."userPermissions" up ON ((up."permissionKey" = p.key)))
UNION
 SELECT p."resourceType",
    p."resourceKey",
    p.permission,
    ug."userKey"
   FROM (("user".permissions p
     JOIN "user"."groupPermissions" gp ON ((gp."permissionKey" = p.key)))
     JOIN "user"."userGroups" ug ON ((ug."groupKey" = gp."groupKey")));


--
-- Name: attachments; Type: TABLE; Schema: various; Owner: -
--

CREATE TABLE various.attachments (
    key text DEFAULT public.gen_random_uuid() NOT NULL,
    "originalName" text,
    "localPath" text,
    "mimeType" text,
    "relatedResourceKey" text,
    description text,
    created timestamp without time zone
);


--
-- Name: metadataChanges; Type: TABLE; Schema: various; Owner: -
--

CREATE TABLE various."metadataChanges" (
    key text DEFAULT public.gen_random_uuid() NOT NULL,
    "resourceType" text,
    "resourceKey" text,
    action text,
    changed timestamp with time zone DEFAULT now(),
    "changedBy" text,
    change jsonb
);


--
-- Name: view; Type: TABLE; Schema: views; Owner: -
--

CREATE TABLE views.view (
    key uuid DEFAULT public.gen_random_uuid() NOT NULL,
    "nameInternal" text,
    "nameDisplay" text,
    description text,
    state jsonb
);


--
-- Data for Name: application; Type: TABLE DATA; Schema: application; Owner: -
--



--
-- Data for Name: configuration; Type: TABLE DATA; Schema: application; Owner: -
--



--
-- Data for Name: layerTree; Type: TABLE DATA; Schema: application; Owner: -
--



--
-- Data for Name: attributeDataSource; Type: TABLE DATA; Schema: dataSources; Owner: -
--



--
-- Data for Name: dataSource; Type: TABLE DATA; Schema: dataSources; Owner: -
--



--
-- Data for Name: raster; Type: TABLE DATA; Schema: dataSources; Owner: -
--



--
-- Data for Name: vector; Type: TABLE DATA; Schema: dataSources; Owner: -
--



--
-- Data for Name: wms; Type: TABLE DATA; Schema: dataSources; Owner: -
--



--
-- Data for Name: wmts; Type: TABLE DATA; Schema: dataSources; Owner: -
--



--
-- Data for Name: areaTree; Type: TABLE DATA; Schema: metadata; Owner: -
--



--
-- Data for Name: areaTreeLevel; Type: TABLE DATA; Schema: metadata; Owner: -
--



--
-- Data for Name: attribute; Type: TABLE DATA; Schema: metadata; Owner: -
--



--
-- Data for Name: attributeSet; Type: TABLE DATA; Schema: metadata; Owner: -
--



--
-- Data for Name: case; Type: TABLE DATA; Schema: metadata; Owner: -
--



--
-- Data for Name: layerTemplate; Type: TABLE DATA; Schema: metadata; Owner: -
--



--
-- Data for Name: period; Type: TABLE DATA; Schema: metadata; Owner: -
--



--
-- Data for Name: place; Type: TABLE DATA; Schema: metadata; Owner: -
--



--
-- Data for Name: scenario; Type: TABLE DATA; Schema: metadata; Owner: -
--



--
-- Data for Name: scope; Type: TABLE DATA; Schema: metadata; Owner: -
--



--
-- Data for Name: style; Type: TABLE DATA; Schema: metadata; Owner: -
--



--
-- Data for Name: tag; Type: TABLE DATA; Schema: metadata; Owner: -
--



--
-- Data for Name: spatial_ref_sys; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: areaRelation; Type: TABLE DATA; Schema: relations; Owner: -
--



--
-- Data for Name: attributeDataSourceRelation; Type: TABLE DATA; Schema: relations; Owner: -
--



--
-- Data for Name: spatialDataSourceRelation; Type: TABLE DATA; Schema: relations; Owner: -
--



--
-- Data for Name: esponFuoreIndicator; Type: TABLE DATA; Schema: specific; Owner: -
--



--
-- Data for Name: lpisChangeCase; Type: TABLE DATA; Schema: specific; Owner: -
--



--
-- Data for Name: groupPermissions; Type: TABLE DATA; Schema: user; Owner: -
--



--
-- Data for Name: groups; Type: TABLE DATA; Schema: user; Owner: -
--

INSERT INTO "user".groups VALUES ('52ddabec-d01a-49a0-bb4d-5ff931bd346e', 'guest');
INSERT INTO "user".groups VALUES ('e56f3545-57f5-44f9-9094-2750a69ef67e', 'user');


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: user; Owner: -
--



--
-- Data for Name: userGroups; Type: TABLE DATA; Schema: user; Owner: -
--

INSERT INTO "user"."userGroups" VALUES ('cad8ea0d-f95e-43c1-b162-0704bfc1d3f6', '52ddabec-d01a-49a0-bb4d-5ff931bd346e');
INSERT INTO "user"."userGroups" VALUES ('cad8ea0d-f95e-43c1-b162-0704bfc1d3f6', 'e56f3545-57f5-44f9-9094-2750a69ef67e');


--
-- Data for Name: userPermissions; Type: TABLE DATA; Schema: user; Owner: -
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: user; Owner: -
--

INSERT INTO "user".users VALUES ('cad8ea0d-f95e-43c1-b162-0704bfc1d3f6', NULL, 'guest', NULL, NULL, NULL);


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: various; Owner: -
--



--
-- Data for Name: metadataChanges; Type: TABLE DATA; Schema: various; Owner: -
--



--
-- Data for Name: view; Type: TABLE DATA; Schema: views; Owner: -
--



--
-- Name: application application_pkey; Type: CONSTRAINT; Schema: application; Owner: -
--

ALTER TABLE ONLY application.application
    ADD CONSTRAINT application_pkey PRIMARY KEY (key);


--
-- Name: configuration configuration_pkey; Type: CONSTRAINT; Schema: application; Owner: -
--

ALTER TABLE ONLY application.configuration
    ADD CONSTRAINT configuration_pkey PRIMARY KEY (key);


--
-- Name: layerTree layerTree_pkey; Type: CONSTRAINT; Schema: application; Owner: -
--

ALTER TABLE ONLY application."layerTree"
    ADD CONSTRAINT "layerTree_pkey" PRIMARY KEY (key);


--
-- Name: attributeDataSource attributeDataSource_pkey; Type: CONSTRAINT; Schema: dataSources; Owner: -
--

ALTER TABLE ONLY "dataSources"."attributeDataSource"
    ADD CONSTRAINT "attributeDataSource_pkey" PRIMARY KEY (key);


--
-- Name: dataSource dataSource_pkey; Type: CONSTRAINT; Schema: dataSources; Owner: -
--

ALTER TABLE ONLY "dataSources"."dataSource"
    ADD CONSTRAINT "dataSource_pkey" PRIMARY KEY (key);


--
-- Name: raster raster_pkey; Type: CONSTRAINT; Schema: dataSources; Owner: -
--

ALTER TABLE ONLY "dataSources".raster
    ADD CONSTRAINT raster_pkey PRIMARY KEY (key);


--
-- Name: vector vector_pkey; Type: CONSTRAINT; Schema: dataSources; Owner: -
--

ALTER TABLE ONLY "dataSources".vector
    ADD CONSTRAINT vector_pkey PRIMARY KEY (key);


--
-- Name: wms wms_pkey; Type: CONSTRAINT; Schema: dataSources; Owner: -
--

ALTER TABLE ONLY "dataSources".wms
    ADD CONSTRAINT wms_pkey PRIMARY KEY (key);


--
-- Name: wmts wmts_pkey; Type: CONSTRAINT; Schema: dataSources; Owner: -
--

ALTER TABLE ONLY "dataSources".wmts
    ADD CONSTRAINT wmts_pkey PRIMARY KEY (key);


--
-- Name: areaTreeLevel areaTreeLevel_pkey; Type: CONSTRAINT; Schema: metadata; Owner: -
--

ALTER TABLE ONLY metadata."areaTreeLevel"
    ADD CONSTRAINT "areaTreeLevel_pkey" PRIMARY KEY (key);


--
-- Name: areaTree areaTree_pkey; Type: CONSTRAINT; Schema: metadata; Owner: -
--

ALTER TABLE ONLY metadata."areaTree"
    ADD CONSTRAINT "areaTree_pkey" PRIMARY KEY (key);


--
-- Name: attributeSet attributeSet_pkey; Type: CONSTRAINT; Schema: metadata; Owner: -
--

ALTER TABLE ONLY metadata."attributeSet"
    ADD CONSTRAINT "attributeSet_pkey" PRIMARY KEY (key);


--
-- Name: attribute attribute_pkey; Type: CONSTRAINT; Schema: metadata; Owner: -
--

ALTER TABLE ONLY metadata.attribute
    ADD CONSTRAINT attribute_pkey PRIMARY KEY (key);


--
-- Name: case case_pkey; Type: CONSTRAINT; Schema: metadata; Owner: -
--

ALTER TABLE ONLY metadata."case"
    ADD CONSTRAINT case_pkey PRIMARY KEY (key);


--
-- Name: layerTemplate layerTemplate_pkey; Type: CONSTRAINT; Schema: metadata; Owner: -
--

ALTER TABLE ONLY metadata."layerTemplate"
    ADD CONSTRAINT "layerTemplate_pkey" PRIMARY KEY (key);


--
-- Name: period period_pkey; Type: CONSTRAINT; Schema: metadata; Owner: -
--

ALTER TABLE ONLY metadata.period
    ADD CONSTRAINT period_pkey PRIMARY KEY (key);


--
-- Name: place place_pkey; Type: CONSTRAINT; Schema: metadata; Owner: -
--

ALTER TABLE ONLY metadata.place
    ADD CONSTRAINT place_pkey PRIMARY KEY (key);


--
-- Name: scenario scenario_pkey; Type: CONSTRAINT; Schema: metadata; Owner: -
--

ALTER TABLE ONLY metadata.scenario
    ADD CONSTRAINT scenario_pkey PRIMARY KEY (key);


--
-- Name: scope scope_pkey; Type: CONSTRAINT; Schema: metadata; Owner: -
--

ALTER TABLE ONLY metadata.scope
    ADD CONSTRAINT scope_pkey PRIMARY KEY (key);


--
-- Name: style style_pkey; Type: CONSTRAINT; Schema: metadata; Owner: -
--

ALTER TABLE ONLY metadata.style
    ADD CONSTRAINT style_pkey PRIMARY KEY (key);


--
-- Name: tag tag_pkey; Type: CONSTRAINT; Schema: metadata; Owner: -
--

ALTER TABLE ONLY metadata.tag
    ADD CONSTRAINT tag_pkey PRIMARY KEY (key);


--
-- Name: areaRelation areaRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."areaRelation"
    ADD CONSTRAINT "areaRelation_pkey" PRIMARY KEY (key);


--
-- Name: areaTreeLevelRelation areaTreeLevelRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."areaTreeLevelRelation"
    ADD CONSTRAINT "areaTreeLevelRelation_pkey" PRIMARY KEY (key);


--
-- Name: areaTreeRelation areaTreeRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."areaTreeRelation"
    ADD CONSTRAINT "areaTreeRelation_pkey" PRIMARY KEY (key);


--
-- Name: attributeDataSourceRelation attributeDataSourceRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."attributeDataSourceRelation"
    ADD CONSTRAINT "attributeDataSourceRelation_pkey" PRIMARY KEY (key);


--
-- Name: attributeRelation attributeRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."attributeRelation"
    ADD CONSTRAINT "attributeRelation_pkey" PRIMARY KEY (key);


--
-- Name: attributeSetRelation attributeSetRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."attributeSetRelation"
    ADD CONSTRAINT "attributeSetRelation_pkey" PRIMARY KEY (key);


--
-- Name: caseRelation caseRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."caseRelation"
    ADD CONSTRAINT "caseRelation_pkey" PRIMARY KEY (key);


--
-- Name: configurationRelation configurationRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."configurationRelation"
    ADD CONSTRAINT "configurationRelation_pkey" PRIMARY KEY (key);


--
-- Name: esponFuoreIndicatorRelation esponFuoreIndicatorRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."esponFuoreIndicatorRelation"
    ADD CONSTRAINT "esponFuoreIndicatorRelation_pkey" PRIMARY KEY (key);


--
-- Name: layerTemplateRelation layerTemplateRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."layerTemplateRelation"
    ADD CONSTRAINT "layerTemplateRelation_pkey" PRIMARY KEY (key);


--
-- Name: layerTreeRelation layerTreeRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."layerTreeRelation"
    ADD CONSTRAINT "layerTreeRelation_pkey" PRIMARY KEY (key);


--
-- Name: lpisChangeCaseRelation lpisChangeCaseRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."lpisChangeCaseRelation"
    ADD CONSTRAINT "lpisChangeCaseRelation_pkey" PRIMARY KEY (key);


--
-- Name: periodRelation periodRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."periodRelation"
    ADD CONSTRAINT "periodRelation_pkey" PRIMARY KEY (key);


--
-- Name: permissionsRelation permissionsRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."permissionsRelation"
    ADD CONSTRAINT "permissionsRelation_pkey" PRIMARY KEY (key);


--
-- Name: placeRelation placeRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."placeRelation"
    ADD CONSTRAINT "placeRelation_pkey" PRIMARY KEY (key);


--
-- Name: scenarioRelation scenarioRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."scenarioRelation"
    ADD CONSTRAINT "scenarioRelation_pkey" PRIMARY KEY (key);


--
-- Name: scopeRelation scopeRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."scopeRelation"
    ADD CONSTRAINT "scopeRelation_pkey" PRIMARY KEY (key);


--
-- Name: spatialDataSourceRelation spatialDataSourceRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."spatialDataSourceRelation"
    ADD CONSTRAINT "spatialDataSourceRelation_pkey" PRIMARY KEY (key);


--
-- Name: styleRelation styleRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."styleRelation"
    ADD CONSTRAINT "styleRelation_pkey" PRIMARY KEY (key);


--
-- Name: tagRelation tagRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."tagRelation"
    ADD CONSTRAINT "tagRelation_pkey" PRIMARY KEY (key);


--
-- Name: usersRelation usersRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."usersRelation"
    ADD CONSTRAINT "usersRelation_pkey" PRIMARY KEY (key);


--
-- Name: viewRelation viewRelation_pkey; Type: CONSTRAINT; Schema: relations; Owner: -
--

ALTER TABLE ONLY relations."viewRelation"
    ADD CONSTRAINT "viewRelation_pkey" PRIMARY KEY (key);


--
-- Name: esponFuoreIndicator esponFuoreIndicator_pkey; Type: CONSTRAINT; Schema: specific; Owner: -
--

ALTER TABLE ONLY specific."esponFuoreIndicator"
    ADD CONSTRAINT "esponFuoreIndicator_pkey" PRIMARY KEY (key);


--
-- Name: lpisChangeCase lpisChangeCase_pkey; Type: CONSTRAINT; Schema: specific; Owner: -
--

ALTER TABLE ONLY specific."lpisChangeCase"
    ADD CONSTRAINT "lpisChangeCase_pkey" PRIMARY KEY (key);


--
-- Name: groupPermissions groupPermissions_pkey; Type: CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user"."groupPermissions"
    ADD CONSTRAINT "groupPermissions_pkey" PRIMARY KEY ("groupKey", "permissionKey");


--
-- Name: groups groups_name_key; Type: CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user".groups
    ADD CONSTRAINT groups_name_key UNIQUE (name);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user".groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (key);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user".permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (key);


--
-- Name: userGroups userGroups_pkey; Type: CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user"."userGroups"
    ADD CONSTRAINT "userGroups_pkey" PRIMARY KEY ("userKey", "groupKey");


--
-- Name: userPermissions userPermissions_pkey; Type: CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user"."userPermissions"
    ADD CONSTRAINT "userPermissions_pkey" PRIMARY KEY ("userKey", "permissionKey");


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user".users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user".users
    ADD CONSTRAINT users_pkey PRIMARY KEY (key);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: various; Owner: -
--

ALTER TABLE ONLY various.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (key);


--
-- Name: metadataChanges metadataChanges_pkey; Type: CONSTRAINT; Schema: various; Owner: -
--

ALTER TABLE ONLY various."metadataChanges"
    ADD CONSTRAINT "metadataChanges_pkey" PRIMARY KEY (key);


--
-- Name: view view_pkey; Type: CONSTRAINT; Schema: views; Owner: -
--

ALTER TABLE ONLY views.view
    ADD CONSTRAINT view_pkey PRIMARY KEY (key);


--
-- Name: groupPermissions groupPermissions_groupKey_fkey; Type: FK CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user"."groupPermissions"
    ADD CONSTRAINT "groupPermissions_groupKey_fkey" FOREIGN KEY ("groupKey") REFERENCES "user".groups(key) ON DELETE CASCADE;


--
-- Name: groupPermissions groupPermissions_permissionKey_fkey; Type: FK CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user"."groupPermissions"
    ADD CONSTRAINT "groupPermissions_permissionKey_fkey" FOREIGN KEY ("permissionKey") REFERENCES "user".permissions(key) ON DELETE CASCADE;


--
-- Name: userGroups userGroups_groupKey_fkey; Type: FK CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user"."userGroups"
    ADD CONSTRAINT "userGroups_groupKey_fkey" FOREIGN KEY ("groupKey") REFERENCES "user".groups(key) ON DELETE CASCADE;


--
-- Name: userGroups userGroups_userKey_fkey; Type: FK CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user"."userGroups"
    ADD CONSTRAINT "userGroups_userKey_fkey" FOREIGN KEY ("userKey") REFERENCES "user".users(key) ON DELETE CASCADE;


--
-- Name: userPermissions userPermissions_permissionKey_fkey; Type: FK CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user"."userPermissions"
    ADD CONSTRAINT "userPermissions_permissionKey_fkey" FOREIGN KEY ("permissionKey") REFERENCES "user".permissions(key) ON DELETE CASCADE;


--
-- Name: userPermissions userPermissions_userKey_fkey; Type: FK CONSTRAINT; Schema: user; Owner: -
--

ALTER TABLE ONLY "user"."userPermissions"
    ADD CONSTRAINT "userPermissions_userKey_fkey" FOREIGN KEY ("userKey") REFERENCES "user".users(key) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

