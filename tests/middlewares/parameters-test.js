const express = require('express');
const httpMocks = require('node-mocks-http');
const {assert} = require('chai');
const {EventEmitter} = require('events');
const parameters = require('../../src/middlewares/parameters');
const Joi = require('@hapi/joi');

function responseMap(response) {
    const m = {status: response.statusCode};
    const data = response._getData();
    if (data !== '') {
        m.body = JSON.parse(data);
    }

    return m;
}

function errorMiddleware(err, request, response, next) {
    response.status(err.status).json(err.data);
}

const ObjectSchema = Joi.object().keys({
    one: Joi.string().valid('first', 'second').required(),
    count: Joi.number().integer().required(),
});

describe('routing/middleware/parameters', function () {
    describe('valid values', function () {
        const tests = [
            {
                name: 'Missing parameters',
                request: {
                    method: 'get',
                    url: '/url',
                },
                parameters: {},
                expectedResponse: {
                    status: 200,
                    body: {
                        route: 'url',
                        parameters: {},
                    },
                },
            },
            {
                name: 'Body parameters',
                request: {
                    method: 'get',
                    url: '/url',
                    body: {one: 'first', count: 3},
                },
                parameters: {body: ObjectSchema},
                expectedResponse: {
                    status: 200,
                    body: {
                        route: 'url',
                        parameters: {
                            body: {one: 'first', count: 3},
                        },
                    },
                },
            },
            {
                name: 'Query parameters',
                request: {
                    method: 'get',
                    url: '/url',
                    query: {one: 'first', count: 3},
                },
                parameters: {query: ObjectSchema},
                expectedResponse: {
                    status: 200,
                    body: {
                        route: 'url',
                        parameters: {
                            query: {one: 'first', count: 3},
                        },
                    },
                },
            },
            {
                name: 'Path parameters',
                request: {
                    method: 'get',
                    url: '/url/first/3',
                },
                parameters: {path: ObjectSchema},
                expectedResponse: {
                    status: 200,
                    body: {
                        route: 'url_one_count',
                        parameters: {
                            path: {one: 'first', count: 3},
                        },
                    },
                },
            },
        ];

        tests.forEach((test) => {
            it(test.name, function (done) {
                const app = express();
                app.get('/url', parameters, function (request, response) {
                    response.status(200).json({
                        route: 'url',
                        parameters: request.parameters,
                    });
                });
                app.get('/url/:one/:count', parameters, function (
                    request,
                    response
                ) {
                    response.status(200).json({
                        route: 'url_one_count',
                        parameters: request.parameters,
                    });
                });

                const request = httpMocks.createRequest(test.request);
                request.match = {data: {parameters: test.parameters}};
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

    describe('invalid values', function () {
        const tests = [
            {
                name: 'Body parameters',
                request: {
                    url: '/url',
                    method: 'get',
                    body: {one: 'unknown', count: 3},
                },
                parameters: {body: ObjectSchema},
                expectedResponse: {
                    status: 400,
                    body: {
                        errors: [
                            {
                                code: 'any.only',
                                detail: '"one" must be one of [first, second]',
                                meta: {
                                    key: 'one',
                                    label: 'one',
                                    valids: ['first', 'second'],
                                    value: 'unknown',
                                },
                                source: {
                                    pointer: '/one',
                                },
                                title: 'Invalid data',
                            },
                        ],
                    },
                },
            },
            {
                name: 'Query parameters',
                request: {
                    url: '/url',
                    method: 'get',
                    query: {one: 'unknown', count: 3},
                },
                parameters: {query: ObjectSchema},
                expectedResponse: {
                    status: 400,
                    body: {
                        errors: [
                            {
                                code: 'any.only',
                                detail: '"one" must be one of [first, second]',
                                meta: {
                                    key: 'one',
                                    label: 'one',
                                    valids: ['first', 'second'],
                                    value: 'unknown',
                                },
                                source: {
                                    parameter: 'one',
                                },
                                title: 'Invalid parameter',
                            },
                        ],
                    },
                },
            },
            {
                name: 'Path parameters',
                request: {
                    url: '/url/unknown/w',
                    method: 'get',
                },
                parameters: {path: ObjectSchema},
                expectedResponse: {
                    status: 400,
                    body: {
                        errors: [{title: 'Invalid path params'}],
                    },
                },
            },
        ];

        tests.forEach((test) => {
            it(test.name, function (done) {
                const app = express();
                app.get('/url', parameters, errorMiddleware, function (
                    request,
                    response
                ) {
                    response.status(200).json({
                        route: 'url',
                        parameters: request.parameters,
                    });
                });
                app.get(
                    '/url/:one/:count',
                    parameters,
                    errorMiddleware,
                    function (request, response) {
                        response.status(200).json({
                            route: 'url_one_count',
                            parameters: request.parameters,
                        });
                    }
                );

                const request = httpMocks.createRequest(test.request);
                request.match = {data: {parameters: test.parameters}};
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
});
