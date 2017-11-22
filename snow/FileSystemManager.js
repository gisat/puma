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

        return this._processManager.getProcessesByKey(
            this._processManager.getProcessKey(null, request, null)
        ).then((processes) => {
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
                    .then((processKey) => {
                        let packageKey = this.generatePackageKey(request);
                        this.getFileMetadata(packageKey)
                            .then((packageMetadata) => {
                                if (!packageMetadata) {
                                    let packageName = `${packageKey}.zip`;
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
                                    return zipPackage.getMissingPaths(packageContentList)
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
                                                .then(() => {
                                                    return packagePath;
                                                })
                                        })
                                        .then((packagePath) => {
                                            return this.deleteFileMetadata(packageKey)
                                                .then(() => {
                                                    return packagePath;
                                                });
                                        })
                                        .then((packagePath) => {
                                            return this.insertFileMetadata(packageKey, request, packageName, packagePath);
                                        });
                                } else {
                                    return packageMetadata;
                                }
                            })
                            .then((packageMetadata) => {
                                return `${config.remoteProtocol}://${config.remoteAddress}/${config.webArchivePublicPath}/${packageMetadata.filename}`;
                            })
                            .then((url) => {
                                return this._processManager.updateProcessByKey(processKey, {
                                    data: {url: url},
                                    success: true
                                });
                            })
                            .catch((error) => {
                                this._processManager.updateProcessByKey(processKey, {
                                    message: error.message,
                                    success: false
                                }, true);
                            });
                        return processKey;
                    })
                    .then((processKey) => {
                        return {
                            ticket: processKey,
                            success: true
                        }
                    });
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

    insertFileMetadata(key, request, fileName, path) {
        let query = [];

        query.push(`INSERT INTO "public"."fsmanager" (`);
        query.push(`key,`);
        query.push(`created,`);
        query.push(`request,`);
        query.push(`filename,`);
        query.push(`path`);
        query.push(`) VALUES (`);
        query.push(`'${key}',`);
        query.push(`${Date.now()},`);
        query.push(`'${JSON.stringify(request)}',`);
        query.push(`'${fileName}',`);
        query.push(`'${path}') RETURNING *;`);

        return this._pgPool.query(query.join(` `))
            .then((result) => {
                if(result.rows.length) {
                    return result.rows[0];
                } else {
                    throw new Error(`insert error`);
                }
            });
    }

    getFileMetadata(key) {
        let query = [];

        query.push(`SELECT * FROM "public"."fsmanager"`);
        query.push(`WHERE key = '${key}';`);

        return this._pgPool.query(query.join(` `))
            .then((result) => {
                if (result.rows.length) {
                    return result.rows[0];
                }
            });
    }

    deleteFileMetadata(key) {
        let query = [];

        query.push(`DELETE FROM "public"."fsmanager"`);
        query.push(`WHERE key = '${key}';`);

        return this._pgPool.query(query.join(` `));
    }

    generatePackageKey(request) {
        return hash(request);
    }

    static initFileSystemManagerPgTable(pool) {
        let query = [];
        query.push(`CREATE TABLE IF NOT EXISTS "public"."fsmanager"`);
        query.push(`(`);
        query.push(`id serial,`);
        query.push(`key varchar(40) not null,`);
        query.push(`created bigint not null,`);
        query.push(`request json not null,`);
        query.push(`filename text not null,`);
        query.push(`path text not null,`);
        query.push(`PRIMARY KEY (id),`);
        query.push(`UNIQUE (key)`);
        query.push(`);`);
        return pool.query(query.join(` `));
    }
}

module.exports = FileSystemManager;