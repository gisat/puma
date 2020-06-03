const {assert} = require('chai');
const config = require('../../../config');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const uuid = require('../../../uuid');

function url(path) {
    return 'http://localhost:' + config.clusterPorts[0] + path;
}

function createToken(payload) {
    return jwt.sign(payload, config.jwt.secret);
}

function createUserAuthHeader(key) {
    return 'Bearer ' + createToken({key, type: 'user'});
}

function createGuestAuthHeader(key) {
    return 'Bearer ' + createToken({key, type: 'guest'});
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
                    const decoded = jwt.verify(data.token, config.jwt.secret);
                    assert.strictEqual(
                        decoded.key,
                        '7c5acddd-3625-46ef-90b3-82f829afb258'
                    );
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

    it('loginGuest', function () {
        return fetch(url('/api/login/login-guest'), {
            method: 'POST',
            headers: new fetch.Headers({
                'Content-Type': 'application/json',
            }),
        }).then((response) => {
            assert.strictEqual(response.status, 200);
            return response.json().then((data) => {
                const decoded = jwt.verify(data.token, config.jwt.secret);
                assert.isString(decoded.key);
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
            return fetch(url('/api/login/getLoginInfo'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization: createUserAuthHeader(
                        '7c5acddd-3625-46ef-90b3-82f829afb258'
                    ),
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                return response.json().then((data) => {
                    assert.deepStrictEqual(data, {
                        key: '7c5acddd-3625-46ef-90b3-82f829afb258',
                        data: {
                            name: null,
                            email: 'test@example.com',
                            phone: null,
                        },
                        groups: [],
                        permissions: {},
                    });
                });
            });
        });

        it('logged in user with groups', function () {
            return fetch(url('/api/login/getLoginInfo'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization: createUserAuthHeader(
                        '2bf6c1da-991a-4592-acc1-b10192db9363'
                    ),
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                return response.json().then((data) => {
                    assert.deepStrictEqual(data, {
                        key: '2bf6c1da-991a-4592-acc1-b10192db9363',
                        data: {
                            name: null,
                            email: 'testWithGroups@example.com',
                            phone: null,
                        },
                        groups: ['guest', 'user'],
                        permissions: {},
                    });
                });
            });
        });

        it('logged in user with phone', function () {
            return fetch(url('/api/login/getLoginInfo'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization: createUserAuthHeader(
                        'e2f5d20e-2784-4690-a3f0-339c60b04245'
                    ),
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                return response.json().then((data) => {
                    assert.deepStrictEqual(data, {
                        key: 'e2f5d20e-2784-4690-a3f0-339c60b04245',
                        data: {
                            name: null,
                            email: 'testWithPhone@example.com',
                            phone: '+420123456789',
                        },
                        groups: [],
                        permissions: {},
                    });
                });
            });
        });

        it('gest', function () {
            const key = uuid.generate();
            return fetch(url('/api/login/getLoginInfo'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization: createGuestAuthHeader(key),
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                return response.json().then((data) => {
                    assert.deepStrictEqual(data, {
                        key: key,
                        data: {
                            name: null,
                            email: null,
                            phone: null,
                        },
                        groups: ['user', 'guest'],
                        permissions: {},
                    });
                });
            });
        });
    });
});
