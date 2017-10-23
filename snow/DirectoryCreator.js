let fs = require('fs');

class DirectoryCreator {
    static async createFullPathDirectory(path) {
        return new Promise(async (resolve, reject) => {
            if(!this.isPathExistsSync(path)) {
                let pathParts = path.split('/');
                pathParts.shift();
                let fullPath = ``;
                for(let pathPart of pathParts) {
                    fullPath += `/${pathPart}`;
                    if(!this.isPathExistsSync(fullPath)) {
                        await this.createDirectory(fullPath).catch(error => {
                            reject(error.message);
                        });
                    }
                }
                this.setFullPermissionsToDirectory(fullPath).then(() => {
                    resolve(fullPath);
                }).catch((error) => {
                    reject(error);
                })
            } else {
                reject(`Unable to create directory on path ${path}. Already exists!`)
            }
        });
    }

    static async createDirectory(path) {
        return new Promise((resolve, reject) => {
            fs.mkdir(path, error => {
                if(error) {
                    reject(error);
                } else {
                    resolve(path);
                }
            });
        });
    }

    static async setFullPermissionsToDirectory(path) {
        return new Promise((resolve, reject) => {
            fs.chmod(path, '777', error => {
                if(error) {
                    reject(error);
                } else {
                    resolve(path);
                }
            });
        });
    }

    static isPathExistsSync(path) {
        return fs.existsSync(path);
    }
}

module.exports = DirectoryCreator;