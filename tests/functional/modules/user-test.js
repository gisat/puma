const {assert} = require('chai');
const fetch = require('node-fetch');
const config = require('../../../config');
const db = require('../../../db');
const _ = require('lodash');
const jwt = require('jsonwebtoken');

db.init();

function url(path) {
    return 'http://localhost:' + config.clusterPorts[0] + path;
}

function userExists(key) {
    return db
        .query(
            `SELECT "key" FROM "${config.pgSchema.user}"."users" WHERE key = $1`,
            [key]
        )
        .then((res) => res.rows.length > 0);
}

function createAdminToken() {
    return (
        'Bearer ' +
        jwt.sign(
            {key: '2d069e3a-f77f-4a1f-aeda-50fd06c8c35d', type: 'user'},
            config.jwt.secret
        )
    );
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
                                        groupKeys: null,
                                        permissionKeys: null,
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
                name: 'single user with groups',
                body: {
                    filter: {
                        key: '2bf6c1da-991a-4592-acc1-b10192db9363',
                    },
                },
                expectedResult: {
                    status: 200,
                    body: {
                        data: {
                            users: [
                                {
                                    key: '2bf6c1da-991a-4592-acc1-b10192db9363',
                                    data: {
                                        email: 'testWithGroups@example.com',
                                        name: null,
                                        phone: null,
                                        groupKeys: [
                                            '52ddabec-d01a-49a0-bb4d-5ff931bd346e',
                                            'e56f3545-57f5-44f9-9094-2750a69ef67e',
                                        ],
                                        permissionKeys: null,
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
                                        groupKeys: null,
                                        permissionKeys: null,
                                    },
                                },
                                {
                                    key: 'e2f5d20e-2784-4690-a3f0-339c60b04245',
                                    data: {
                                        email: 'testWithPhone@example.com',
                                        name: null,
                                        phone: '+420123456789',
                                        groupKeys: null,
                                        permissionKeys: null,
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
                                        groupKeys: null,
                                        permissionKeys: null,
                                    },
                                },
                                {
                                    key: '7c5acddd-3625-46ef-90b3-82f829afb258',
                                    data: {
                                        email: 'test@example.com',
                                        name: null,
                                        phone: null,
                                        groupKeys: null,
                                        permissionKeys: null,
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

    it('POST /rest/user', async function () {
        const response = await fetch(url('/rest/user'), {
            method: 'POST',
            headers: new fetch.Headers({
                Authorization: createAdminToken(),
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
        });

        assert.strictEqual(response.status, 201);

        const data = await response.json();
        data.data.users = _.sortBy(data.data.users, (u) => u.data.email);
        delete data.data.users[0].key;

        assert.deepStrictEqual(data, {
            data: {
                users: [
                    {
                        data: {
                            email: 'new@example.com',
                            name: null,
                            phone: null,
                            groupKeys: null,
                            permissionKeys: null,
                        },
                    },
                    {
                        key: '8b162b2f-44ee-47a4-af6c-0bbc882b6bb8',
                        data: {
                            email: 'newWithKey@example.com',
                            name: null,
                            phone: null,
                            groupKeys: null,
                            permissionKeys: null,
                        },
                    },
                ],
            },
            success: true,
            total: 2,
        });
    });

    it('POST /rest/user without permissions', async function () {
        const response = await fetch(url('/rest/user'), {
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
        });

        assert.strictEqual(response.status, 403);

        const data = await response.json();

        assert.deepStrictEqual(data, {
            success: false,
        });
    });

    it('PUT /rest/user', async function () {
        const response = await fetch(url('/rest/user'), {
            method: 'PUT',
            headers: new fetch.Headers({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
                data: {
                    users: [
                        {
                            key: '8b162b2f-44ee-47a4-af6c-0bbc882b6bb8',
                            data: {
                                phone: '+420111111111',
                            },
                        },
                    ],
                },
            }),
        });

        assert.strictEqual(response.status, 200);
        const data = await response.json();
        assert.deepStrictEqual(data, {
            data: {
                users: [
                    {
                        data: {
                            email: 'newWithKey@example.com',
                            name: null,
                            phone: '+420111111111',
                            groupKeys: null,
                            permissionKeys: null,
                        },
                        key: '8b162b2f-44ee-47a4-af6c-0bbc882b6bb8',
                    },
                ],
            },
            success: true,
            total: 1,
        });
    });

    it('DELETE /rest/user', async function () {
        const userKey = '8b162b2f-44ee-47a4-af6c-0bbc882b6bb8';

        // guard
        assert.isTrue(await userExists(userKey));

        const response = await fetch(url('/rest/user'), {
            method: 'DELETE',
            headers: new fetch.Headers({
                'Content-Type': 'application/json',
            }),
            body: JSON.stringify({
                data: {
                    users: [
                        {
                            key: userKey,
                        },
                    ],
                },
            }),
        });

        assert.strictEqual(response.status, 200);
        assert.isFalse(await userExists(userKey));
    });
});
