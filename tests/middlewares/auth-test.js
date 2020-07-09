const express = require('express');
const httpMocks = require('node-mocks-http');
const {assert} = require('chai');
const {EventEmitter} = require('events');
const authMiddleware = require('../../src/middlewares/auth');

function responseMap(response) {
    const m = {status: response.statusCode};
    const data = response._getData();
    if (data !== '') {
        m.body = JSON.parse(data);
    }

    return m;
}

describe('middlewares/auth', function () {
    const tests = [
        {
            name: 'without user',
            request: {
                method: 'get',
                url: '/auth',
            },
            expectedResponse: {
                status: 401,
            },
        },
        {
            name: 'with user',
            request: {
                method: 'get',
                url: '/auth',
                user: {id: 3},
            },
            expectedResponse: {
                status: 200,
                body: {route: 'auth'},
            },
        },
    ];

    const app = express();
    app.get('/auth', authMiddleware, function (request, response) {
        response.status(200).json({route: 'auth'});
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
