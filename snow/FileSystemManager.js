let hash = require(`object-hash`);
let fs = require(`fs`);

let config = require(`../config`);

let ProcessManager = require(`./ProcessManager`);
let ZipPackageCreator = require(`./ZipPackageCreator`);

class FileSystemManager {
    constructor(pgPool) {
        this._pgPool = pgPool;
        this._processManager = new ProcessManager(this._pgPool);
    }

    publishPackageWithSnowGeoTiffs(request, url) {
        if (!Object.keys(request).length) return Promise.reject(`empty`);

        let processKey = this._processManager.getProcessKey(null, request, null);
        return this._processManager.getProcessesByKey(processKey)
            .then((processes) => {
                if (processes.length) {
                    if (processes[0].result) {
                        return processes[0].result;
                    } else {
                        return {
                            ticket: processes[0].key,
                            success: true
                        }
                    }
                } else {
                    return this._processManager.createProcess(null, request, url, null)
                        .then(() => {
                            let packageName = `${processKey}.zip`;
                            let packagePath = `${config.snow.paths.packagesForDownloadPath}/${packageName}`;

                            let packageContentList = [];
                            if (request.hasOwnProperty(`scenes`)) {
                                request.scenes.forEach((sceneName) => {
                                    packageContentList.push(
                                        `${config.snow.paths.scenesGeotiffStoragePath}/${sceneName}.tif`
                                    );
                                });
                            }
                            if (request.hasOwnProperty(`composites`)) {
                                request.composites.forEach((compositeName) => {
                                    packageContentList.push(
                                        `${config.snow.paths.compositesGeotiffStoragePath}/${compositeName}.tif`
                                    );
                                });
                            }

                            let zipPackage = new ZipPackageCreator(packagePath);
                            zipPackage.getMissingPaths(packageContentList)
                                .then((missingPaths) => {
                                    if (missingPaths.length) {
                                        throw new Error(`file not found (${missingPaths})`);
                                    } else {
                                        return zipPackage.addFilesToZipPackage(packageContentList);
                                    }
                                })
                                .then(() => {
                                    return zipPackage.storeZipPackageToFs()
                                })
                                .then(() => {
                                    return packagePath;
                                })
                                .then((packagePath) => {
                                    return this.createSymbolicLinkToFile(packagePath, `${config.webArchivePath}/${packageName}`)
                                })
                                .then(() => {
                                    return `${config.remoteProtocol}://${config.remoteAddress}${config.webArchivePublicPath}/${packageName}`;
                                })
                                .then((url) => {
                                    return this._processManager.updateProcessByKey(processKey, {data: {url: url}, success: true});
                                })
                                .catch((error) => {
                                    this._processManager.updateProcessByKey(processKey, {message: error.message, success: false});
                                });
                        })
                        .then(() => {
                            return {
                                ticket: processKey,
                                success: true
                            }
                        });
                }
            });
    }

    createFileNameFromRequest(request) {
        return hash(request);
    }

    getFileMetadata(key) {
        let query = [];
        query.push(`SELECT * FROM fsmanager`);
        query.push(`WHERE`);
        query.push(`key='${key}'`);
        return this._pgPool.pool().query(query.join(` `))
            .then(result => {
                if (result.rowCount) {
                    return result.rows[0];
                } else {
                    throw new Error(`not found`);
                }
            });
    }

    createSymbolicLinkToFile(target, source) {
        return new Promise((resolve, reject) => {
            fs.symlink(target, source, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            })
        });
    }

    isFileExists(path) {
        return new Promise((resolve) => {
            fs.access(path, (error) => {
                if (error) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    initFileSystemManagerPgTable() {
        let query = [];
        query.push(`CREATE TABLE IF NOT EXISTS fsmanager`);
        query.push(`(`);
        query.push(`id serial,`);
        query.push(`key varchar(40) not null,`);
        query.push(`created timestamp not null,`);
        query.push(`request json not null,`);
        query.push(`path text not null,`);
        query.push(`PRIMARY KEY (id),`);
        query.push(`UNIQUE (key)`);
        query.push(`);`);
        return this._pgPool.pool().query(query.join(` `));
    }
}

module.exports = FileSystemManager;