const {assert} = require('chai');
const Joi = require('../src/joi');

describe('joi', function () {
    describe('stringArray', function () {
        const tests = [
            {
                name: 'single item',
                value: 'one',
                schema: Joi.stringArray().items(Joi.string()),
                expectedValue: ['one'],
            },
            {
                name: 'two items',
                value: 'one,two',
                schema: Joi.stringArray().items(Joi.string()),
                expectedValue: ['one', 'two'],
            },
        ];

        tests.forEach((test) => {
            it(test.name, function () {
                assert.deepStrictEqual(test.schema.validate(test.value), {
                    value: test.expectedValue,
                });
            });
        });
    });
});
