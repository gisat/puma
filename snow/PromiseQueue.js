let config = require(`../config`);
let _ = require(`lodash`);

class PromiseQueue {
    constructor() {
        this._concurrent = config.snow.cores;
        this._runningPromises = [];
        this._promiseQueue = [];

        this.queueExecutor();
    }

    /**
     * Add function to queue
     */
    addToQueue(functionPromise) {
        this._promiseQueue.push(functionPromise);
    }

    queueExecutor() {
        setInterval(() => {
            if(this._runningPromises.length < this._concurrent && this._promiseQueue.length) {
                this._runningPromises.push(this._promiseQueue.shift().call().catch((error) => {console.log(error)}));
            } else {
                for (let index in this._runningPromises) {
                    if (this._runningPromises[index]) {
                        this._runningPromises[index].catch(() => {
                        }).then(() => {
                            this._runningPromises.splice(index, 1);
                        });
                    }
                }
            }
        }, 100);
    }

    /**
     * Return resolved promise if process queue is empty
     * @returns {Promise}
     */
    isQueueEmpty() {
        return new Promise((resolve, reject) => {
            let intervalId = setInterval(() => {
                if (!this._runningPromises.length) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 1000);
        });
    }
}

module.exports = PromiseQueue;