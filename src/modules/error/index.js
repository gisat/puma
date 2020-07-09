const db = require('../../db');
const {SQL} = require('sql-template-strings');

class HttpError extends Error {
    /**
     * @param {number} status
     * @param {object} data
     */
    constructor(status, data) {
        super();
        this.status = status;
        this.data = data;
    }
}

/**
 * @param {object} data
 *
 * @returns {Promise<number>}
 */
async function log(data) {
    const res = await db.query(
        SQL`INSERT INTO "various"."errorLogs"("data") VALUES(${data}) RETURNING "key"`
    );

    return res.rows[0]['key'];
}

function requestData(request) {
    return {
        url: request.url,
        method: request.method,
        user: request.user,
    };
}

function formatError(err) {
    if (err instanceof HttpError) {
        return {status: err.status, data: err.data};
    }

    if (err instanceof Error) {
        return {
            status: 500,
            data: {
                name: err.name,
                message: err.message,
                stack: err.stack,
            },
        };
    }

    return {status: 500, data: err};
}

async function errorMiddleware(err, request, response, next) {
    const formatted = formatError(err);
    const reqData = requestData(request);

    const logId = await log({
        request: reqData,
        errorData: formatted.data,
    });

    return response
        .status(formatted.status)
        .json({success: false, code: logId});
}

module.exports = {
    HttpError,
    errorMiddleware,
};
