const {assert} = require('chai');
const http = require('http');
const config = require('../../../config');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const uuid = require('../../../uuid');

function url(path) {
    return 'http://localhost:' + config.clusterPorts[0] + path;
}

describe('modules/login', function () {
    describe('login', function () {
        it('login', function (done) {
            fetch(url('/api/login/login'), {
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
                response.json().then((data) => {
                    const decoded = jwt.verify(data.token, config.jwt.secret);
                    assert.strictEqual(
                        decoded.key,
                        '7c5acddd-3625-46ef-90b3-82f829afb258'
                    );

                    done();
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
                it(test.name, function (done) {
                    fetch(url('/api/login/login'), {
                        method: 'POST',
                        headers: new fetch.Headers({
                            'Content-Type': 'application/json',
                        }),
                        body: JSON.stringify(test.body),
                    }).then((response) => {
                        assert.strictEqual(response.status, 401);
                        done();
                    });
                });
            });
        });
    });

    it('loginGuest', function (done) {
        fetch(url('/api/login/login-guest'), {
            method: 'POST',
            headers: new fetch.Headers({
                'Content-Type': 'application/json',
            }),
        }).then((response) => {
            assert.strictEqual(response.status, 200);
            response.json().then((data) => {
                const decoded = jwt.verify(data.token, config.jwt.secret);
                assert.isString(decoded.key);

                done();
            });
        });
    });

    it('logout', function (done) {
        fetch(url('/api/login/logout'), {
            method: 'POST',
            headers: new fetch.Headers({
                'Content-Type': 'application/json',
            }),
        }).then((response) => {
            assert.strictEqual(response.status, 200);
            done();
        });
    });

    describe('logged', function () {
        it('guest', function (done) {
            fetch(url('/rest/logged'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 404);
                done();
            });
        });

        it('logged user', function (done) {
            fetch(url('/rest/logged'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization:
                        'Bearer ' + jwt.sign({key: 'k3'}, config.jwt.secret),
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                response.json().then((data) => {
                    assert.deepStrictEqual(data, {key: 'k3'});
                    done();
                });
            });
        });
    });

    describe('getLoginInfo', function () {
        it('logged in user', function (done) {
            fetch(url('/api/login/getLoginInfo'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization:
                        'Bearer ' +
                        jwt.sign(
                            {key: '7c5acddd-3625-46ef-90b3-82f829afb258'},
                            config.jwt.secret
                        ),
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                response.json().then((data) => {
                    assert.deepStrictEqual(data, {
                        key: '7c5acddd-3625-46ef-90b3-82f829afb258',
                        data: {
                            name: null,
                            email: 'test@example.com',
                        },
                        groups: [],
                        permissions: {},
                    });
                    done();
                });
            });
        });

        it('logged in user with groups', function () {
            return fetch(url('/api/login/getLoginInfo'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization:
                        'Bearer ' +
                        jwt.sign(
                            {key: '2bf6c1da-991a-4592-acc1-b10192db9363'},
                            config.jwt.secret
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
                        },
                        groups: ['guest', 'user'],
                        permissions: {},
                    });
                });
            });
        });

        it('gest', function (done) {
            const key = uuid.generate();
            fetch(url('/api/login/getLoginInfo'), {
                method: 'GET',
                headers: new fetch.Headers({
                    'Content-Type': 'application/json',
                    Authorization:
                        'Bearer ' + jwt.sign({key: key}, config.jwt.secret),
                }),
            }).then((response) => {
                assert.strictEqual(response.status, 200);
                response.json().then((data) => {
                    assert.deepStrictEqual(data, {
                        key: key,
                        data: {
                            name: null,
                            email: null,
                        },
                        groups: [],
                        permissions: {},
                    });
                    done();
                });
            });
        });
    });
});
