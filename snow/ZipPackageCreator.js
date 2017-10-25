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
        return Promise.resolve().then(async () => {
            for (let filePath of filePaths) {
                let file = useFullPaths ? filePath : filePath.split('/').pop();
                this._packageObject.file(file, fs.readFileSync(filePath));
            }
        });
    }

    storeZipPackageToFs() {
        return new Promise((resolve, reject) => {
            this._packageObject
                .generateNodeStream({type: 'nodebuffer', streamFiles: true})
                .pipe(fs.createWriteStream(this._packagePath))
                .on('finish', () => {
                    resolve(this._packagePath);
                });
        });
    }

    getMissingPaths(pathList) {
        return Promise.resolve().then(async () => {
                let missingPaths = [];
            for (let path of pathList) {
                    await new Promise((resolve, reject) => {
                    fs.access(path, (error) => {
                        if (error) {
                            missingPaths.push(path);
                        }
                        resolve();
                    });
                });
            }
            return missingPaths;
        });
    }
}

module.exports = ZipPackageCreator;