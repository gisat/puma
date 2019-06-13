const AWS = require('aws-sdk');

class S3Bucket {
    constructor(name, accessKeyId, secretAccessKey) {
        this._s3 = new AWS.S3({
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey
        });

        this._name = name;
    }

    upload(name, content) {
        const toUpload = {
            Bucket: this._name,
            Key: name,
            Body: content
        };

        return new Promise((resolve, reject) => {
            this._s3.upload (toUpload, function (err, data) {
                if (err) {
                    console.log("Error", err);
                    reject(err);
                } if (data) {
                    console.log("Upload Success", data.Location);
                    resolve(data);
                }
            });
        });
    }

    download(name) {
        const toDownload = {
            Bucket: this._name,
            Key: name
        };
        return new Promise((resolve, reject) => {
            this._s3.getObject (toDownload, function (err, data) {
                if (err) {
                    console.log("Error", err);
                    reject(err);
                } if (data) {
                    console.log("Download    Success", data);
                    resolve(data);
                }
            });
        });
    }

    delete(name) {
        const toDelete = {
            Bucket: this._name,
            Key: name
        };
        return new Promise((resolve, reject) => {
            this._s3.deleteObject(toDelete, function(err, data) {
                if (err) {
                    console.log(err, err.stack);
                    reject(err);
                } else  {
                    console.log(data);
                    resolve(data);
                }
            });
        });
    }
}

module.exports = S3Bucket;