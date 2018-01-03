let bcrypt = require('bcrypt');

/**
 * Class encapsulating the operations necessary to generate the hash.
 */
class PasswordHash {
    constructor(textToHash) {
        this._textToHash = textToHash;
    }

    toString(){
        return bcrypt.hash(this._textToHash, 10);
    }
}

module.exports = PasswordHash;