const should = require('should');

const GeoJsonToSql = require('../../../integration/lulc/GeoJsonToSql');

describe('GeoJsonToSql', () => {
    describe('#sql', () => {
        it('returns valid sql.', () => {
            const sql = new GeoJsonToSql({
                features: [
                    {
                        properties: {
                            'AL1_ID': 'test',
                            'as_12_attr_1_period_1': 123,
                            'as_13_attr_2_period_2': 1,
                            'atotal': 12
                        }
                    }
                ]
            }, 'i11_dhaka_al1', 1).sql();

            should(sql).be.exactly(`ALTER TABLE i11_dhaka_al1 ADD COLUMN IF NOT EXISTS as_12_attr_1_period_1 FLOAT; ALTER TABLE i11_dhaka_al1 ADD COLUMN IF NOT EXISTS as_13_attr_2_period_2 FLOAT; ALTER TABLE i11_dhaka_al1 ADD COLUMN IF NOT EXISTS tatotal FLOAT;UPDATE i11_dhaka_al1 SET as_12_attr_1_period_1 = 123 WHERE "AL1_ID" = \'test\'; UPDATE i11_dhaka_al1 SET as_13_attr_2_period_2 = 1 WHERE "AL1_ID" = \'test\'; UPDATE i11_dhaka_al1 SET tatotal = 12 WHERE "AL1_ID" = \'test\';`)
        })
    })
});