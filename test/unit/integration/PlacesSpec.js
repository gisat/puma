const should = require('should');

const connectToMongo = require('../../connectToMongo');
const Places = require('../../../integration/lulc/Places');

describe('Places', () => {
    describe('#create', () => {
        const scopeId = 600000000;
        before(async done => {
            try {
                const db = await connectToMongo();
                await db.collection('location').deleteMany({
                    dataset: scopeId
                });
                await db.collection('layerref').deleteMany({
                    location: 10
                });

                done();
            } catch (e) {
                done(e);
            }
        });

        it('Creates new city', async done => {
            try {
                const db = await connectToMongo();
                const requestedSqls = [];
                const places = new Places({
                    query: sql => {
                        requestedSqls.push(sql);

                        return Promise.resolve();
                    }
                }, db);
                await places.create(10, scopeId, 'Dhaka', '12,23,12,45', [
                    'geonode:i11_dhaka_al1',
                    'geonode:i12_dhaka_al2'
                ]);

                should(requestedSqls.length).be.exactly(12);
                should(requestedSqls[0]).be.exactly('CREATE TABLE views.base_11 AS ( \n            SELECT "AL1_ID" as gid,\n            ST_Centroid(ST_Transform(the_geom, 4326)) AS centroid,\n            ST_Area(ST_Transform(the_geom, 4326)::geography) AS area,\n            ST_Length(ST_Transform(the_geom, 4326)) as length,\n            Box2D(ST_Transform(the_geom, 4326)) AS extent\n            FROM i11_dhaka_al1\n        )');

                done();
            } catch (e) {
                done(e);
            }
        })
    });

    describe('#addAttributes', () => {


        const layerRefs = [{
            "_id": 1,
            "layer": "geonode:geonode:i11_dhaka_al1",
            "columnMap": [
                {
                    "column": "as_1_attr_1",
                    "attribute": 1
                },
                {
                    "column": "as_1_attr_2",
                    "attribute": 2
                }
            ],
            "isData": true,
            "fidColumn": "AL0_ID",
            "attributeSet": 1,
            "year": 1,
            "location": 2,
            "areaTemplate": 1,
            "active": true,
            "dataSourceOrigin": "geonode"
        }, {
            "_id": 2,
            "layer": "geonode:geonode:i11_dhaka_al1",
            "columnMap": [
                {
                    "column": "as_1_attr_1",
                    "attribute": 1
                },
                {
                    "column": "as_1_attr_2",
                    "attribute": 2
                }
            ],
            "fidColumn": "AL0_ID",
            "isData": true,
            "attributeSet": 1,
            "year": 2,
            "location": 2,
            "areaTemplate": 1,
            "active": true,
            "dataSourceOrigin": "geonode"
        }];

        before(async done => {
            try {
                const db = await connectToMongo();

                await db.collection('layerref').removeMany({areaTemplate: 1});
                await db.collection('layerref').insertMany([{
                    "_id": 5000,
                    "isData": false,
                    "areaTemplate": 1,
                    "year": 1,
                    "location": 2,
                    "layer": "geonode:i11_dhaka_al1",
                    "fidColumn": "AL0_ID"
                }, {
                    "_id": 5001,
                    "isData": false,
                    "areaTemplate": 1,
                    "year": 2,
                    "location": 2,
                    "layer": "geonode:i11_dhaka_al1",
                    "fidColumn": "AL0_ID"
                }]);
                await db.collection('layerref').insertMany(layerRefs);

                done();
            } catch (error) {
                done(error);
            }
        });

        it('add attributes based on the layerrefs', async done => {
            try {
                const db = await connectToMongo();
                const requestedSqls = [];
                const places = new Places({
                    query: sql => {
                        requestedSqls.push(sql);
                    }
                }, db);

                await places.addAttributes(layerRefs, 2);

                should(requestedSqls.length).be.exactly(2);
                should(requestedSqls[0]).be.exactly(`CREATE MATERIALIZED VIEW views.layer_5000 AS SELECT
                l_i11_dhaka_al1."AL0_ID" AS gid,
                NULL::integer AS name,
                l_i11_dhaka_al1."the_geom" AS the_geom,
                NULL::integer AS parentgid,
                l_geonode."as_1_attr_1" AS as_1_attr_1, l_geonode."as_1_attr_2" AS as_1_attr_2, 
                baseTable.area,
                baseTable.length,
                baseTable.centroid,
                baseTable.extent
                FROM views.base_5000 as baseTable
                  LEFT JOIN public."i11_dhaka_al1" AS l_i11_dhaka_al1 ON l_i11_dhaka_al1."AL0_ID"::text = baseTable.gid::text LEFT JOIN public."geonode" AS l_geonode ON l_geonode."AL0_ID"::text = baseTable.gid::text;
            `);
                should(requestedSqls[1]).be.exactly(`CREATE MATERIALIZED VIEW views.layer_5001 AS SELECT
                l_i11_dhaka_al1."AL0_ID" AS gid,
                NULL::integer AS name,
                l_i11_dhaka_al1."the_geom" AS the_geom,
                NULL::integer AS parentgid,
                l_geonode."as_1_attr_1" AS as_1_attr_1, l_geonode."as_1_attr_2" AS as_1_attr_2, 
                baseTable.area,
                baseTable.length,
                baseTable.centroid,
                baseTable.extent
                FROM views.base_5001 as baseTable
                  LEFT JOIN public."i11_dhaka_al1" AS l_i11_dhaka_al1 ON l_i11_dhaka_al1."AL0_ID"::text = baseTable.gid::text LEFT JOIN public."geonode" AS l_geonode ON l_geonode."AL0_ID"::text = baseTable.gid::text;
            `);

                done();
            } catch(err) {
                done(err);
            }
        })
    });
});
