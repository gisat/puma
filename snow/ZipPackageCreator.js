let JSZip = require('jszip');
let fs = require('fs');

class ZipPackageCreator {
    constructor(packagePath) {
        this._packagePath = packagePath;
        this._packageObject = ZipPackageCreator.createZipPackageObject();
    }

    static createZipPackageObject() {
        return JSZip();
    }

    addFilesToZipPackage(filePaths, useFullPaths) {
        return Promise.resolve().then(() => {
            for (let filePath of filePaths) {
                let file = useFullPaths ? filePath : filePath.split('/').pop();
                this._packageObject.file(
                    file,
                    new Promise((resolve, reject) => {
                        fs.readFile(filePath, (error, data) => {
                            if (error) {
                                reject(error);
                            } else {
                                resolve(data);
                            }
                        });
                    })
                );
            }
        });
    }

    storeZipPackageToFs() {
        return new Promise((resolve, reject) => {
            this._packageObject
                .generateNodeStream({type: 'nodebuffer', streamFiles: true})
                .pipe(fs.createWriteStream(this._packagePath))
                .on('finish', () => {
                    resolve(`Created zip package at ${this._packagePath}`);
                })
                .on('error', (error) => {
                    reject(error);
                });
        });
    }
}

module.exports = ZipPackageCreator;