const MongoClient = require('mongodb').MongoClient;

module.exports = async function connectToMongo() {
    return new Promise((resolve, reject) => {
        MongoClient.connect('mongodb://localhost:27017/panther', function (err, dbs) {
            if (err) {
                reject(err);
            } else {
                resolve(dbs);
            }
        })
    })
};