const express = require('express');
const httpMocks = require('node-mocks-http');
const {assert} = require('chai');
const {EventEmitter} = require('events');
const config = require('../../config');
const jwt = require('jsonwebtoken');
const userMiddleware = require('../../src/middlewares/user');

function responseMap(response) {
    const m = {status: response.statusCode};
    const data = response._getData();
    if (data !== '') {
        m.body = JSON.parse(data);
    }

    return m;
}

describe('middlewares/user', function () {
    const tests = [
        {
            name: 'no authorization header',
            request: {
                method: 'get',
                url: '/user-info',
            },
            expectedResponse: {
                status: 200,
                body: {
                    route: 'user-info',
                },
            },
        },
        {
            name: 'invalid authorization header (misspelled Bearer)',
            request: {
                method: 'get',
                url: '/user-info',
                headers: {
                    authorization:
                        'Bear ' + jwt.sign({id: 1}, config.jwt.secret),
                },
            },
            expectedResponse: {
                status: 200,
                body: {
                    route: 'user-info',
                },
            },
        },
        {
            name: 'invalid authorization header (too many spaces)',
            request: {
                method: 'get',
                url: '/user-info',
                headers: {
                    authorization:
                        'Bearer ' +
                        jwt.sign({id: 1}, config.jwt.secret) +
                        ' redundat',
                },
            },
            expectedResponse: {
                status: 200,
                body: {
                    route: 'user-info',
                },
            },
        },
        {
            name: 'invalid authorization header (too many spaces)',
            request: {
                method: 'get',
                url: '/user-info',
                headers: {
                    authorization:
                        'Bearer ' +
                        jwt.sign({id: 1}, config.jwt.secret) +
                        ' redundat',
                },
            },
            expectedResponse: {
                status: 200,
                body: {
                    route: 'user-info',
                },
            },
        },
        {
            name: 'invalid authorization header (invalid token)',
            request: {
                method: 'get',
                url: '/user-info',
                headers: {
                    authorization: 'Bearer nonsense',
                },
            },
            expectedResponse: {
                status: 401,
            },
        },
        {
            name: 'valid authorization header',
            request: {
                method: 'get',
                url: '/user-info',
                headers: {
                    authorization:
                        'Bearer ' + jwt.sign({id: 1}, config.jwt.secret),
                },
            },
            expectedResponse: {
                status: 200,
                body: {
                    route: 'user-info',
                    user: {id: 1},
                },
            },
        },
        {
            name: 'valid authorization cookie',
            request: {
                method: 'get',
                url: '/user-info',
                cookies: {authToken: jwt.sign({id: 1}, config.jwt.secret)},
            },
            expectedResponse: {
                status: 200,
                body: {
                    route: 'user-info',
                    user: {id: 1},
                },
            },
        },
        {
            name: 'expired token',
            request: {
                method: 'get',
                url: '/user-info',
                headers: {
                    authorization:
                        'Bearer ' +
                        jwt.sign({id: 1}, config.jwt.secret, {
                            expiresIn: '-1h',
                        }),
                },
            },
            expectedResponse: {
                status: 401,
            },
        },
    ];

    const app = express();
    app.get('/user-info', userMiddleware, function (request, response) {
        const user = request.user;
        if (user != null) {
            response
                .status(200)
                .json({route: 'user-info', user: {id: user.id}});
        }

        response.status(200).json({route: 'user-info'});
    });

    tests.forEach((test) => {
        it(test.name, function (done) {
            const request = httpMocks.createRequest(test.request);
            const response = httpMocks.createResponse({
                eventEmitter: EventEmitter,
            });
            response.on('end', () => {
                assert.deepStrictEqual(
                    responseMap(response),
                    test.expectedResponse
                );
                done();
            });

            app.handle(request, response);
        });
    });
});
