const {assert} = require('chai');
const config = require('../../../config');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const uuid = require('../../../src/uuid');

function url(path) {
    return 'http://localhost:' + config.clusterPorts[0] + path;
}

function createToken(payload) {
    return jwt.sign(payload, config.jwt.secret);
}

function createUserToken(key) {
    return createToken({key, realKey: key, type: 'user'});
}

function createGuestToken(key) {
    return createToken({
        key,
        realKey: 'cad8ea0d-f95e-43c1-b162-0704bfc1d3f6',
        type: 'guest',
    });
}

function createAuthHeader(token) {
    return 'Bearer ' + token;
}

function createUserAuthHeader(key) {
    return createAuthHeader(createUserToken(key));
}

function createGuestAuthHeader(key) {
    return createAuthHeader(createGuestToken(key));
}

describe('modules/login', function () {
    describe('login', function () {
        it('login', function () {
            return fetch(url('/api/login/login'), {
                method: 'POST',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                }),
                body: JSON.stringify({
                    username: 'test@example.com',
                    password: 'test',
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                return response.json().then((data) => {
                    const token = data.authToken;
                    delete data.authToken;

                    assert.isString(token);
                    assert.deepStrictEqual(data, {
                        data: {
                            email: 'test@example.com',
                            name: null,
                            phone: null,
                        },
                        key: '7c5acddd-3625-46ef-90b3-82f829afb258',
                        permissions: {
                            application: {},
                            dataSources: {},
                            metadata: {},
                            relations: {},
                            specific: {},
                            user: {},
                            views: {},
                        },
                    });
                });
            });
        });

        describe('invalid login', function () {
            const tests = [
                {
                    name: 'invalid password',
                    body: {
                        username: 'test@example.com',
                        password: 'wrong',
                    },
                },
                {
                    name: 'non existing username',
                    body: {
                        username: 'nonexisting@example.com',
                        password: 'test',
                    },
                },
            ];

            tests.forEach((test) => {
                it(test.name, function () {
                    return fetch(url('/api/login/login'), {
                        method: 'POST',
                        headers: new fetch.Headers({
                            'Content-Type': 'application/json',
                        }),
                        body: JSON.stringify(test.body),
                    }).then((response) => {
                        assert.strictEqual(response.status, 401);
                    });
                });
            });
        });
    });

    it('logout', function () {
        return fetch(url('/api/login/logout'), {
            method: 'POST',
            headers: new fetch.Headers({
                'Content-Type': 'application/json',
            }),
        }).then((response) => {
            assert.strictEqual(response.status, 200);
        });
    });

    describe('logged', function () {
        it('guest', function () {
            return fetch(url('/rest/logged'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 404);
            });
        });

        it('logged user', function () {
            return fetch(url('/rest/logged'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization: createUserAuthHeader('k3'),
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                return response.json().then((data) => {
                    assert.deepStrictEqual(data, {key: 'k3'});
                });
            });
        });
    });

    describe('getLoginInfo', function () {
        it('logged in user', function () {
            const token = createUserToken(
                '7c5acddd-3625-46ef-90b3-82f829afb258'
            );
            return fetch(url('/api/login/getLoginInfo'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization: createAuthHeader(token),
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                return response.json().then((data) => {
                    delete data.permissions; // skip permission check
                    assert.deepStrictEqual(data, {
                        key: '7c5acddd-3625-46ef-90b3-82f829afb258',
                        data: {
                            name: null,
                            email: 'test@example.com',
                            phone: null,
                        },
                        authToken: token,
                    });
                });
            });
        });

        it('logged in user with groups', function () {
            const token = createUserToken(
                '2bf6c1da-991a-4592-acc1-b10192db9363'
            );
            return fetch(url('/api/login/getLoginInfo'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization: createAuthHeader(token),
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                return response.json().then((data) => {
                    delete data.permissions; // skip permission check
                    assert.deepStrictEqual(data, {
                        key: '2bf6c1da-991a-4592-acc1-b10192db9363',
                        data: {
                            name: null,
                            email: 'testWithGroups@example.com',
                            phone: null,
                        },
                        authToken: token,
                    });
                });
            });
        });

        it('logged in user with phone', function () {
            const token = createUserToken(
                'e2f5d20e-2784-4690-a3f0-339c60b04245'
            );
            return fetch(url('/api/login/getLoginInfo'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization: createAuthHeader(token),
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                return response.json().then((data) => {
                    delete data.permissions; // skip permission check
                    assert.deepStrictEqual(data, {
                        key: 'e2f5d20e-2784-4690-a3f0-339c60b04245',
                        data: {
                            name: null,
                            email: 'testWithPhone@example.com',
                            phone: '+420123456789',
                        },
                        authToken: token,
                    });
                });
            });
        });

        it('logged in user with permissions', function () {
            const token = createUserToken(
                '3e3f4300-1336-4043-baa3-b65a025c2d83'
            );
            return fetch(url('/api/login/getLoginInfo'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization: createAuthHeader(token),
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                return response.json().then((data) => {
                    assert.deepStrictEqual(data, {
                        key: '3e3f4300-1336-4043-baa3-b65a025c2d83',
                        data: {
                            name: null,
                            email: 'testWithPermissions@example.com',
                            phone: null,
                        },
                        permissions: {
                            application: {},
                            dataSources: {},
                            metadata: {
                                case: {
                                    create: true,
                                    update: true,
                                },
                                scope: {
                                    delete: true,
                                },
                            },
                            relations: {},
                            specific: {},
                            user: {},
                            views: {},
                        },
                        authToken: token,
                    });
                });
            });
        });

        it('guest', function () {
            const key = uuid.generate();
            const token = createGuestToken(key);
            return fetch(url('/api/login/getLoginInfo'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization: createAuthHeader(token),
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                return response.json().then((data) => {
                    assert.deepStrictEqual(data, {
                        key: key,
                        data: {
                            name: 'guest',
                            email: null,
                            phone: null,
                        },
                        permissions: {
                            application: {},
                            dataSources: {},
                            metadata: {
                                case: {
                                    update: true,
                                },
                            },
                            relations: {},
                            specific: {},
                            user: {},
                            views: {},
                        },
                        authToken: token,
                    });
                });
            });
        });
    });
});
