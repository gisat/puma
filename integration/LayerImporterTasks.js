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
        
        session._importerTasks[taskId] = {
            id: taskId,
            started: new Date(),
            status: "importing",
            progress: 0
        };
        
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

module.exports = LayerImporterTasks;