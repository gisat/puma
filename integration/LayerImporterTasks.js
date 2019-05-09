let conn = require('../common/conn');

class LayerImporterTasks {
    constructor() {
        this._importerTasks = [];
    }
    
    /**
     * Create new import task object
     * @param session
     * @returns {{started: Date, status: string, step: number}}
     */
    createNewImportTask(session) {
        let taskId = conn.getNextId();

        if(!session._importerTasks) {
            session._importerTasks = {};
        }
        
        session._importerTasks[taskId] = new ImporterTask(session, taskId, new Date(), "importing", 0);
        
        return session._importerTasks[taskId];
    }
    
    /**
     * Return importer task for given id
     * @param session
     * @param id
     * @returns importer task object
     */
    getImporterTask(session, id) {
        return session._importerTasks[id];
    }
}

class ImporterTask {
    constructor(session, id, started, status, progress) {
        this.started = started;

        this._session = session;
        this._id = id;

        this._progress = progress;
        this._status = status;
    }

    get id() {
        return this._id;
    }

    get status() {
        return this._session[this._id]._status;
    }

    set status(status) {
        this._session[this._id]._status = status;
    }

    get progress() {
        return this._session[this._id]._progress;
    }

    set progress(progress) {
        this._session[this._id]._progress = progress;
    }
}

module.exports = LayerImporterTasks;