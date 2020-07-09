const uuid = require('uuid').v1;

function generate() {
    return uuid();
}

module.exports = {
    generate,
};
