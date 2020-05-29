const {assert} = require('chai');
const http = require('http');
const config = require('../../../config');
const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

function url(path) {
    return 'http://localhost:' + config.clusterPorts[0] + path;
}

describe('routes/LoginController', function () {
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
            // todo: verify token
            done();
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
                body: {username: 'nonexisting@example.com', password: 'test'},
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
});
