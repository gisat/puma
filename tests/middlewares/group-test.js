const express = require('express');
const httpMocks = require('node-mocks-http');
const {assert} = require('chai');
const {EventEmitter} = require('events');
const groupMiddleware = require('../../src/middlewares/group');

function responseMap(response) {
    const m = {status: response.statusCode};
    const data = response._getData();
    if (data !== '') {
        m.body = JSON.parse(data);
    }

    return m;
}

describe('middlewares/group', function () {
    const tests = [
        {
            name: 'no user',
            anyOf: ['admin'],
            request: {
                method: 'get',
                url: '/group',
            },
            expectedResponse: {status: 403},
        },
        {
            name: 'user with empty',
            anyOf: ['admin'],
            request: {
                method: 'get',
                url: '/group',
                user: {
                    id: 1,
                    groups: [],
                },
            },
            expectedResponse: {status: 403},
        },
        {
            name: 'user without required group',
            anyOf: ['admin'],
            request: {
                method: 'get',
                url: '/group',
                user: {
                    id: 1,
                    groups: ['user', 'manager'],
                },
            },
            expectedResponse: {status: 403},
        },
        {
            name: 'user without required group matching one of',
            anyOf: ['admin', 'superadmin'],
            request: {
                method: 'get',
                url: '/group',
                user: {
                    id: 1,
                    groups: ['user', 'manager'],
                },
            },
            expectedResponse: {status: 403},
        },
        {
            name: 'user with exact group',
            anyOf: ['admin'],
            request: {
                method: 'get',
                url: '/group',
                user: {
                    id: 1,
                    groups: ['admin'],
                },
            },
            expectedResponse: {status: 200, body: {route: 'group'}},
        },
        {
            name: 'user with exact group among others',
            anyOf: ['admin'],
            request: {
                method: 'get',
                url: '/group',
                user: {
                    id: 1,
                    groups: ['user', 'admin', 'manager'],
                },
            },
            expectedResponse: {status: 200, body: {route: 'group'}},
        },
        {
            name: 'user with exact group matching one of',
            anyOf: ['admin', 'superadmin'],
            request: {
                method: 'get',
                url: '/group',
                user: {
                    id: 1,
                    groups: ['user', 'admin', 'manager'],
                },
            },
            expectedResponse: {status: 200, body: {route: 'group'}},
        },
    ];

    tests.forEach((test) => {
        it(test.name, function (done) {
            const app = express();
            app.get('/group', groupMiddleware.anyOf(test.anyOf), function (
                request,
                response
            ) {
                response.status(200).json({route: 'group'});
            });

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
