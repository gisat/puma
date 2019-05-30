class LulcStatus {
    constructor(connection, uuid) {
        this._connection = connection;
        this._uuid = uuid;

        this._collection = 'lulcintegration';
    }

    async create() {
        return this._connection.collection(this._collection).insert({
            state: 'running',
            uuid: this._uuid
        })
    }

    async status() {
        const results = await this._connection.collection(this._collection).find({uuid: this._uuid}).toArray();
        return results[0]
    }

    async update(status){
        this._connection.collection(this._collection).update({uuid: this._uuid}, {
            state: status,
            uuid: this._uuid
        });

    }

    async error(err) {
        this._connection.collection(this._collection).update({uuid: this._uuid}, {
            state: 'Error',
            message: err,
            uuid: this._uuid
        });
    }
}

module.exports = LulcStatus;