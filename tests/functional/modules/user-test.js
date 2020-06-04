const {assert} = require('chai');
const fetch = require('node-fetch');
const config = require('../../../config');

function url(path) {
    return 'http://localhost:' + config.clusterPorts[0] + path;
}

describe('modules/user', function () {
    describe('POST /rest/user/filtered/users', function () {
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
                        data: {
                            users: [
                                {
                                    key: '7c5acddd-3625-46ef-90b3-82f829afb258',
                                    data: {
                                        email: 'test@example.com',
                                        name: null,
                                        phone: null,
                                    },
                                },
                            ],
                        },
                        total: 1,
                        limit: 100,
                        offset: 0,
                        success: true,
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
                        data: {
                            users: [
                                {
                                    key: '7c5acddd-3625-46ef-90b3-82f829afb258',
                                    data: {
                                        email: 'test@example.com',
                                        name: null,
                                        phone: null,
                                    },
                                },
                                {
                                    key: 'e2f5d20e-2784-4690-a3f0-339c60b04245',
                                    data: {
                                        email: 'testWithPhone@example.com',
                                        name: null,
                                        phone: '+420123456789',
                                    },
                                },
                            ],
                        },
                        total: 2,
                        offset: 0,
                        limit: 100,
                        success: true,
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
                        data: {
                            users: [
                                {
                                    key: 'e2f5d20e-2784-4690-a3f0-339c60b04245',
                                    data: {
                                        email: 'testWithPhone@example.com',
                                        name: null,
                                        phone: '+420123456789',
                                    },
                                },
                                {
                                    key: '7c5acddd-3625-46ef-90b3-82f829afb258',
                                    data: {
                                        email: 'test@example.com',
                                        name: null,
                                        phone: null,
                                    },
                                },
                            ],
                        },
                        total: 2,
                        offset: 0,
                        limit: 100,
                        success: true,
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

    it('POST /rest/user', function () {
        return fetch(url('/rest/user'), {
            method: 'POST',
            headers: new fetch.Headers({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
                data: {
                    users: [
                        {
                            data: {
                                email: 'new@example.com',
                            },
                        },
                        {
                            key: '8b162b2f-44ee-47a4-af6c-0bbc882b6bb8',
                            data: {
                                email: 'newWithKey@example.com',
                            },
                        },
                    ],
                },
            }),
        }).then((response) => {
            assert.strictEqual(response.status, 201);
            return response.json().then((data) => {
                const users = data.data.users;

                const firstUser = users[0];
                assert.isString(firstUser.key);
                delete firstUser.key;
                assert.deepStrictEqual(users[0], {
                    data: {
                        email: 'new@example.com',
                        name: null,
                        phone: null,
                    },
                });

                assert.deepStrictEqual(users[1], {
                    key: '8b162b2f-44ee-47a4-af6c-0bbc882b6bb8',
                    data: {
                        email: 'newWithKey@example.com',
                        name: null,
                        phone: null,
                    },
                });
            });
        });
    });
});
