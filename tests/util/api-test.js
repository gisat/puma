const {assert} = require('chai');
const apiUtil = require('../../src/util/api');

describe('util/api', function () {
    describe('fieldPathToQueryPath', function () {
        const tests = [
            {
                field: ['filter'],
                expectedPath: 'filter',
            },
            {
                field: ['filter', 'partner'],
                expectedPath: 'filter[partner]',
            },
            {
                field: ['field', 'property', 'another'],
                expectedPath: 'field[property][another]',
            },
        ];

        tests.forEach((test) => {
            it(
                'should correctly convert "' + test.field + '" field',
                function () {
                    assert.deepEqual(
                        apiUtil.fieldPathToQueryPath(test.field),
                        test.expectedPath
                    );
                }
            );
        });
    });

    describe('fieldPathToDataPath', function () {
        const tests = [
            {
                field: ['filter'],
                expectedPath: '/filter',
            },
            {
                field: ['filter', 'partner'],
                expectedPath: '/filter/partner',
            },
            {
                field: ['field', 'property', 'another'],
                expectedPath: '/field/property/another',
            },
        ];

        tests.forEach((test) => {
            it(
                'should correctly convert "' + test.field + '" field',
                function () {
                    assert.deepEqual(
                        apiUtil.fieldPathToDataPath(test.field),
                        test.expectedPath
                    );
                }
            );
        });
    });
});
