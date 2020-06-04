const {assert} = require('chai');
const fetch = require('node-fetch');
const config = require('../../../config');

function url(path) {
    return 'http://localhost:' + config.clusterPorts[0] + path;
}

describe('modules/user', function () {
    describe('/rest/user/filtered/users', function () {
        const tests = [
            {
                name: 'single user',
                body: {
                    filter: {
                        key: '7c5acddd-3625-46ef-90b3-82f829afb258',
                    },
                },
                expectedResult: {
                    status: 200,
                    body: {
                        rows: [
                            {
                                key: '7c5acddd-3625-46ef-90b3-82f829afb258',
                                email: 'test@example.com',
                                name: null,
                                phone: null,
                            },
                        ],
                        count: 1,
                    },
                },
            },
            {
                name: 'ordered users (asc)',
                body: {
                    filter: {
                        key: {
                            in: [
                                '7c5acddd-3625-46ef-90b3-82f829afb258',
                                'e2f5d20e-2784-4690-a3f0-339c60b04245',
                            ],
                        },
                    },
                    order: [['key', 'ascending']],
                },
                expectedResult: {
                    status: 200,
                    body: {
                        rows: [
                            {
                                key: '7c5acddd-3625-46ef-90b3-82f829afb258',
                                email: 'test@example.com',
                                name: null,
                                phone: null,
                            },
                            {
                                email: 'testWithPhone@example.com',
                                key: 'e2f5d20e-2784-4690-a3f0-339c60b04245',
                                name: null,
                                phone: '+420123456789',
                            },
                        ],
                        count: 2,
                    },
                },
            },
            {
                name: 'ordered users (desc)',
                body: {
                    filter: {
                        key: {
                            in: [
                                '7c5acddd-3625-46ef-90b3-82f829afb258',
                                'e2f5d20e-2784-4690-a3f0-339c60b04245',
                            ],
                        },
                    },
                    order: [['key', 'descending']],
                },
                expectedResult: {
                    status: 200,
                    body: {
                        rows: [
                            {
                                email: 'testWithPhone@example.com',
                                key: 'e2f5d20e-2784-4690-a3f0-339c60b04245',
                                name: null,
                                phone: '+420123456789',
                            },
                            {
                                key: '7c5acddd-3625-46ef-90b3-82f829afb258',
                                email: 'test@example.com',
                                name: null,
                                phone: null,
                            },
                        ],
                        count: 2,
                    },
                },
            },
        ];

        tests.forEach((test) => {
            it(test.name, function () {
                return fetch(url('/rest/user/filtered/users'), {
                    method: 'POST',
                    headers: new fetch.Headers({
                        'Content-Type': 'application/json',
                    }),
                    body: JSON.stringify(test.body),
                }).then((response) => {
                    assert.strictEqual(
                        response.status,
                        test.expectedResult.status
                    );
                    return response.json().then((data) => {
                        assert.deepStrictEqual(data, test.expectedResult.body);
                    });
                });
            });
        });
    });
});
